'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';

function UnsubscribeContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [email, setEmail] = useState<string>('');

  useEffect(() => {
    handleUnsubscribe();
  }, []);

  const handleUnsubscribe = async () => {
    try {
      // URL에서 고객 ID 가져오기
      const customerId = searchParams.get('id');

      if (!customerId) {
        setStatus('error');
        return;
      }

      // 고객 정보 조회
      const { data: customer, error: fetchError } = await supabase
        .from('customers')
        .select('email')
        .eq('id', customerId)
        .single();

      if (fetchError || !customer) {
        console.error('고객 조회 실패:', fetchError);
        setStatus('error');
        return;
      }

      setEmail(customer.email);

      // 상태를 'unsubscribed'로 업데이트
      const { error: updateError } = await supabase
        .from('customers')
        .update({ status: 'unsubscribed' })
        .eq('id', customerId);

      if (updateError) {
        console.error('상태 업데이트 실패:', updateError);
        setStatus('error');
        return;
      }

      setStatus('success');
    } catch (error) {
      console.error('처리 중 오류:', error);
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center">
          {/* 로고 */}
          <div className="mb-6">
            <img 
              src="https://www.vinus.co.kr/coldmail/images/logo_black.png" 
              alt="VINUS" 
              className="h-8 mx-auto"
              onError={(e) => (e.currentTarget.style.display = 'none')}
            />
          </div>

          {/* 이미지 */}
          <div className="mb-6">
            <img 
              src="https://www.vinus.co.kr/coldmail/images/bye.png" 
              alt="Goodbye" 
              className="w-32 mx-auto"
            />
          </div>

          {/* 상태별 메시지 */}
          {status === 'loading' && (
            <div className="space-y-3">
              <p className="text-lg text-gray-500">처리 중...</p>
              <p className="text-2xl font-bold text-gray-900">잠시만 기다려주세요.</p>
            </div>
          )}

          {status === 'success' && (
            <div className="space-y-3">
              <p className="text-lg font-semibold text-gray-700">{email}</p>
              <p className="text-2xl font-extrabold text-gray-900">
                수신거부 처리가 완료되었습니다.
              </p>
              <div className="text-sm text-gray-500 space-y-1">
                <p>원하지 않는 메일로 불편을 드렸다면 죄송합니다.</p>
                <p>귀사의 무한한 발전을 기원하겠습니다.</p>
              </div>
              <p className="text-sm text-gray-900 mt-4">감사합니다.</p>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-3">
              <p className="text-lg text-gray-500">오류</p>
              <p className="text-2xl font-bold text-red-600">
                처리 중 오류가 발생했습니다.
              </p>
              <div className="text-sm text-gray-500 space-y-1">
                <p>잘못된 링크이거나 이미 처리된 요청입니다.</p>
                <p>문의사항은 고객센터로 연락 부탁드립니다.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="text-center">
            <p className="text-lg text-gray-500">로딩 중...</p>
          </div>
        </div>
      </div>
    }>
      <UnsubscribeContent />
    </Suspense>
  );
}

