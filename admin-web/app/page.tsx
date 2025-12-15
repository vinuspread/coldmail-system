'use client';

import { useEffect, useState } from 'react';
import { supabase } from './lib/supabaseClient';
import { PlayCircle, PauseCircle, Mail, Users, Clock } from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState({
    total: 0,
    sent: 0,
    ready: 0,
  });
  const [isRunning, setIsRunning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  // 통계 및 설정 불러오기
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000); // 5초마다 갱신
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      // 통계 조회
      const { data: customers } = await supabase.from('customers').select('status');
      
      if (customers) {
        setStats({
          total: customers.length,
          sent: customers.filter((c) => c.status === 'sent').length,
          ready: customers.filter((c) => c.status === 'ready').length,
        });
      }

      // 발송 상태 조회
      const { data: config } = await supabase
        .from('app_config')
        .select('is_running')
        .eq('id', 1)
        .single();

      if (config) {
        setIsRunning(config.is_running);
      }
    } catch (error) {
      console.error('데이터 로딩 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // 발송 시작/정지 토글
  const toggleRunning = async () => {
    setToggling(true);
    try {
      const newState = !isRunning;
      const { error } = await supabase
        .from('app_config')
        .update({ is_running: newState })
        .eq('id', 1);

      if (error) throw error;

      setIsRunning(newState);
      alert(newState ? '✅ 발송이 시작되었습니다!' : '⏸️ 발송이 정지되었습니다.');
    } catch (error: any) {
      alert('❌ 상태 변경 실패: ' + error.message);
    } finally {
      setToggling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 헤더 */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">대시보드</h1>
        <p className="mt-2 text-sm text-gray-600">
          콜드메일 발송 현황을 확인하고 제어하세요.
        </p>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <StatCard
          icon={<Users className="w-6 h-6" />}
          label="총 고객 수"
          value={stats.total}
          color="blue"
        />
        <StatCard
          icon={<Mail className="w-6 h-6" />}
          label="발송 완료"
          value={stats.sent}
          color="green"
        />
        <StatCard
          icon={<Clock className="w-6 h-6" />}
          label="대기 중"
          value={stats.ready}
          color="yellow"
        />
      </div>

      {/* 제어 패널 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">발송 제어</h2>
        
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">
              현재 상태: 
              <span className={`ml-2 font-semibold ${isRunning ? 'text-green-600' : 'text-gray-500'}`}>
                {isRunning ? '🟢 발송 중' : '⏸️ 정지됨'}
              </span>
            </p>
          </div>
          
          <button
            onClick={toggleRunning}
            disabled={toggling}
            className={`
              flex items-center gap-2 px-6 py-3 rounded-lg font-medium text-white
              transition-colors disabled:opacity-50
              ${isRunning 
                ? 'bg-red-600 hover:bg-red-700' 
                : 'bg-green-600 hover:bg-green-700'
              }
            `}
          >
            {toggling ? (
              <>처리 중...</>
            ) : isRunning ? (
              <>
                <PauseCircle className="w-5 h-5" />
                발송 정지
              </>
            ) : (
              <>
                <PlayCircle className="w-5 h-5" />
                발송 시작
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// 통계 카드 컴포넌트
function StatCard({ icon, label, value, color }: any) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center">
        <div className={`rounded-lg p-3 ${colorClasses[color as keyof typeof colorClasses]}`}>
          {icon}
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-600">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

