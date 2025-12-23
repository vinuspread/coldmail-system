import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

// 1. 환경변수 로드 (.env 파일 읽기)
dotenv.config();

// 2. 설정값 가져오기 (이름이 .env와 정확히 일치해야 함)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY; // 여기를 수정했습니다!

const smtpHost = process.env.SMTP_HOST;
const smtpPort = parseInt(process.env.SMTP_PORT || '465');
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const smtpFrom = process.env.SMTP_FROM || smtpUser;
const adminBaseUrl = process.env.ADMIN_BASE_URL || 'http://localhost:3000'; // 수신거부 링크용

// 3. 필수값 체크 (없으면 바로 에러 뿜고 종료)
if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 에러: Supabase 설정이 없습니다. .env 파일을 확인하세요.');
  console.error(`- URL: ${supabaseUrl}`);
  console.error(`- KEY: ${supabaseKey ? '설정됨(숨김)' : '없음'}`);
  process.exit(1);
}

// 4. Supabase 클라이언트 생성
const supabase = createClient(supabaseUrl, supabaseKey);

// 5. 메일 발송기(Transporter) 설정
const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: true, // 465 포트는 true, 587은 false
  auth: {
    user: smtpUser,
    pass: smtpPass,
  },
});

// 대기 함수 (Random sleep)
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// 메인 실행 함수
async function startWorker() {
  console.log(`🚀 일꾼 시작! (SMTP: ${smtpUser})`);
  console.log('🔄 설정 확인 중...');

  while (true) {
    try {
      // 1. 리모컨(설정) 상태 확인
      const { data: config, error: configError } = await supabase
        .from('app_config')
        .select('*')
        .eq('id', 1)
        .single();

      if (configError) {
        console.error('⚠️ 설정 조회 실패:', configError.message);
        await sleep(10000); // 10초 대기 후 재시도
        continue;
      }

      // 2. 즉시발송(dispatch) 우선 확인 (시스템 OFF 상태에서도 발송)
      // 단, unsubscribed 상태는 제외
      let { data: customers, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('status', 'dispatch')
        .limit(1);

      // dispatch가 없고, 시스템이 꺼져있으면 대기
      if ((!customers || customers.length === 0) && (!config || config.is_running === false)) {
        process.stdout.write('.'); // 화면 도배 방지용 점 찍기
        await sleep(10000); // 10초 대기
        continue;
      }

      // dispatch가 없고, 시스템이 켜져있으면 ready 조회
      if ((!customers || customers.length === 0) && config.is_running) {
        console.log('\n🟢 발송 신호 감지! 대상 조회 중...');
        const readyResult = await supabase
          .from('customers')
          .select('*')
          .eq('status', 'ready')
          .limit(1);
        
        customers = readyResult.data;
        customerError = readyResult.error;
      } else if (customers && customers.length > 0) {
        console.log('\n🚀 즉시발송 감지! 대상 조회 중...');
      }

      if (customerError) {
        console.error('⚠️ 고객 조회 실패:', customerError.message);
        await sleep(5000);
        continue;
      }

      if (!customers || customers.length === 0) {
        console.log('✅ 보낼 고객이 없습니다. (모두 완료됨)');
        // 너무 자주 조회하지 않게 대기 시간을 늘림
        await sleep(10000);
        continue;
      }

      const customer = customers[0];
      
      // 즉시 상태 변경하여 중복 발송 방지 (락 걸기)
      const { error: lockError } = await supabase
        .from('customers')
        .update({ status: 'sending' })
        .eq('id', customer.id)
        .eq('status', customer.status); // 현재 상태일 때만 변경 (동시성 제어)

      if (lockError) {
        console.error('⚠️ 상태 변경 실패:', lockError.message);
        await sleep(2000);
        continue;
      }

      console.log(`📧 발송 시도: ${customer.company_name} (${customer.email}) [${customer.status}]`);

      // 4. 템플릿 치환
      let mailSubject = config.email_subject || '제안서입니다.';
      let mailBody = config.email_template || '<p>안녕하세요.</p>';

      // {{company_name}} 등을 실제 데이터로 바꾸기
      mailBody = mailBody.replace(/{{company_name}}/g, customer.company_name || '');
      mailBody = mailBody.replace(/{{ceo_name}}/g, customer.ceo_name || '대표님');

      // 수신거부 링크에 이메일 주소 포함
      const unsubscribeUrl = `http://www.vinus.co.kr/coldmail/unsubscribe.html?email=${encodeURIComponent(customer.email)}`;
      mailBody = mailBody.replace(
        /http:\/\/www\.vinus\.co\.kr\/coldmail\/unsubscribe\.html/g,
        unsubscribeUrl
      );

      // 5. 메일 발송
      try {
        await transporter.sendMail({
          from: `"${process.env.SMTP_USER}" <${process.env.SMTP_FROM}>`, // 발신자 표시
          to: customer.email,
          subject: mailSubject,
          html: mailBody,
        });

        // 성공 처리
        console.log(`✅ 발송 성공! -> ${customer.email}`);
        await supabase
          .from('customers')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
          })
          .eq('id', customer.id);

      } catch (sendError: any) {
        // 실패 처리
        console.error(`❌ 발송 실패: ${sendError.message}`);
        await supabase
          .from('customers')
          .update({
            status: 'failed',
            fail_reason: sendError.message,
          })
          .eq('id', customer.id);
      }

      // 6. 스팸 방지 딜레이 (5초 ~ 10초 랜덤)
      const delay = Math.floor(Math.random() * 5000) + 5000;
      console.log(`⏳ 쿨타임: ${delay / 1000}초 대기...`);
      await sleep(delay);

    } catch (err) {
      console.error('🔥 알 수 없는 에러:', err);
      await sleep(10000);
    }
  }
}

// 실행
startWorker();