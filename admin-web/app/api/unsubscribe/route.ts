import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabase 클라이언트 생성 (서버 사이드)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { success: false, message: '이메일이 제공되지 않았습니다.' },
        { status: 400 }
      );
    }

    // 이메일로 고객 조회 및 상태 업데이트
    const { data, error } = await supabase
      .from('customers')
      .update({ status: 'unsubscribed' })
      .eq('email', email)
      .select();

    if (error) {
      console.error('DB 업데이트 실패:', error);
      return NextResponse.json(
        { success: false, message: 'DB 업데이트 실패' },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { success: false, message: '해당 이메일을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '수신거부 처리가 완료되었습니다.',
      email: email,
    });
  } catch (error) {
    console.error('API 에러:', error);
    return NextResponse.json(
      { success: false, message: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// CORS 처리 (필요시)
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}


