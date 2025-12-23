'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from './lib/supabaseClient';
import { PlayCircle, PauseCircle, Mail, Users, Clock, RefreshCw, Send } from 'lucide-react';

interface Customer {
  id: number;
  company_name: string;
  ceo_name?: string;
  email: string;
  status: string;
  sent_at?: string;
  fail_reason?: string;
}

export default function Dashboard() {
  const [stats, setStats] = useState({
    total: 0,
    sent: 0,
    ready: 0,
    failed: 0,
    dispatch: 0,
    sending: 0,
    unsubscribed: 0,
  });
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const hasCompletedRef = useRef(false);

  // 통계 및 설정 불러오기
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000); // 5초마다 갱신
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      // 전체 고객 조회
      const { data: customersData } = await supabase
        .from('customers')
        .select('*')
        .order('id', { ascending: false });
      
      let newStats = {
        total: 0,
        sent: 0,
        ready: 0,
        failed: 0,
        dispatch: 0,
        sending: 0,
        unsubscribed: 0,
      };

      if (customersData) {
        setCustomers(customersData);
        newStats = {
          total: customersData.length,
          sent: customersData.filter((c) => c.status === 'sent').length,
          ready: customersData.filter((c) => c.status === 'ready').length,
          failed: customersData.filter((c) => c.status === 'failed').length,
          dispatch: customersData.filter((c) => c.status === 'dispatch').length,
          sending: customersData.filter((c) => c.status === 'sending').length,
          unsubscribed: customersData.filter((c) => c.status === 'unsubscribed').length,
        };
        setStats(newStats);
      }

      // 발송 상태 조회
      const { data: config } = await supabase
        .from('app_config')
        .select('is_running')
        .eq('id', 1)
        .single();

      let currentIsRunning = false;
      if (config) {
        currentIsRunning = config.is_running;
        setIsRunning(currentIsRunning);
      }

      // 발송 완료 감지
      if (
        currentIsRunning && 
        newStats.total > 0 && 
        newStats.ready === 0 && 
        newStats.dispatch === 0 && 
        newStats.sending === 0 && 
        !hasCompletedRef.current
      ) {
        hasCompletedRef.current = true;
        
        // 알림 표시
        alert('🎉 모든 메일 발송이 완료되었습니다! 발송을 자동으로 정지합니다.');
        
        // 자동 정지
        const { error } = await supabase
          .from('app_config')
          .update({ is_running: false })
          .eq('id', 1);

        if (!error) {
          setIsRunning(false);
        }
      }

      // 발송이 시작되면 완료 플래그 리셋
      if (currentIsRunning && (newStats.ready > 0 || newStats.dispatch > 0 || newStats.sending > 0)) {
        hasCompletedRef.current = false;
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
      
      // 발송 시작 시 완료 플래그 리셋
      if (newState) {
        hasCompletedRef.current = false;
      }
      
      alert(newState ? '✅ 발송이 시작되었습니다!' : '⏸️ 발송이 정지되었습니다.');
    } catch (error: any) {
      alert('❌ 상태 변경 실패: ' + error.message);
    } finally {
      setToggling(false);
    }
  };

  // 실패 건 재발송
  const retryFailed = async () => {
    if (stats.failed === 0) {
      alert('재발송할 실패 건이 없습니다.');
      return;
    }

    if (!confirm(`총 ${stats.failed}건의 실패 내역을 대기 상태로 되돌리시겠습니까?`)) {
      return;
    }

    setRetrying(true);
    try {
      const { error } = await supabase
        .from('customers')
        .update({ status: 'ready', sent_at: null })
        .eq('status', 'failed');

      if (error) throw error;

      hasCompletedRef.current = false; // 완료 플래그 리셋
      alert(`✅ 총 ${stats.failed}건의 실패 내역을 대기 상태로 되돌렸습니다.`);
      await fetchData(); // 통계 새로고침
    } catch (error: any) {
      alert('❌ 재발송 처리 실패: ' + error.message);
    } finally {
      setRetrying(false);
    }
  };

  // 완료 상태 초기화
  const resetSent = async () => {
    if (stats.sent === 0) {
      alert('초기화할 완료 건이 없습니다.');
      return;
    }

    if (!confirm(`총 ${stats.sent}건의 완료 내역을 대기 상태로 되돌리시겠습니까?`)) {
      return;
    }

    setResetting(true);
    try {
      const { error } = await supabase
        .from('customers')
        .update({ status: 'ready', sent_at: null })
        .eq('status', 'sent');

      if (error) throw error;

      hasCompletedRef.current = false; // 완료 플래그 리셋
      alert(`✅ 총 ${stats.sent}건의 완료 내역을 대기 상태로 되돌렸습니다.`);
      await fetchData(); // 통계 새로고침
    } catch (error: any) {
      alert('❌ 초기화 실패: ' + error.message);
    } finally {
      setResetting(false);
    }
  };

  // 선택 고객 즉시 발송
  const scheduleSelected = async () => {
    if (selectedIds.length === 0) {
      alert('발송할 고객을 선택해주세요.');
      return;
    }

    if (!confirm(`선택한 ${selectedIds.length}명에게 즉시 메일을 발송하시겠습니까? (시스템 정지 상태여도 발송됩니다)`)) {
      return;
    }

    setScheduling(true);
    try {
      const { error } = await supabase
        .from('customers')
        .update({ status: 'dispatch', sent_at: null })
        .in('id', selectedIds);

      if (error) throw error;

      hasCompletedRef.current = false;
      setSelectedIds([]);
      alert(`✅ ${selectedIds.length}명이 즉시 발송 대기열에 추가되었습니다. 곧 발송이 시작됩니다.`);
      await fetchData();
    } catch (error: any) {
      alert('❌ 발송 실패: ' + error.message);
    } finally {
      setScheduling(false);
    }
  };

  // 전체 선택/해제
  const toggleAllSelection = () => {
    if (selectedIds.length === customers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(customers.map(c => c.id));
    }
  };

  // 개별 선택/해제
  const toggleSelection = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  // 날짜 포맷팅
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 상태 뱃지
  const getStatusBadge = (status: string) => {
    const styles = {
      ready: 'bg-yellow-100 text-yellow-800',
      dispatch: 'bg-purple-100 text-purple-800',
      sending: 'bg-blue-100 text-blue-800',
      sent: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      unsubscribed: 'bg-gray-100 text-gray-800',
    };
    const labels = {
      ready: '대기',
      dispatch: '즉시발송',
      sending: '발송중',
      sent: '완료',
      failed: '실패',
      unsubscribed: '수신거부',
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded ${styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800'}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    );
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
            {stats.sending > 0 && (
              <p className="text-sm text-blue-600 mt-1">
                📤 발송 중 {stats.sending}건
              </p>
            )}
            {stats.dispatch > 0 && (
              <p className="text-sm text-purple-600 mt-1">
                🚀 즉시발송 대기 {stats.dispatch}건
              </p>
            )}
            {stats.failed > 0 && (
              <p className="text-sm text-amber-600 mt-1">
                ⚠️ 실패 건 {stats.failed}개 대기 중
              </p>
            )}
            {stats.unsubscribed > 0 && (
              <p className="text-sm text-gray-600 mt-1">
                🚫 수신거부 {stats.unsubscribed}건
              </p>
            )}
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={resetSent}
              disabled={resetting || stats.sent === 0}
              className={`
                flex items-center gap-2 px-6 py-3 rounded-lg font-medium text-white
                transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                bg-gray-600 hover:bg-gray-700
              `}
            >
              {resetting ? (
                <>처리 중...</>
              ) : (
                <>
                  <RefreshCw className="w-5 h-5" />
                  완료 상태 초기화
                </>
              )}
            </button>

            <button
              onClick={retryFailed}
              disabled={retrying || stats.failed === 0}
              className={`
                flex items-center gap-2 px-6 py-3 rounded-lg font-medium text-white
                transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                bg-amber-600 hover:bg-amber-700
              `}
            >
              {retrying ? (
                <>처리 중...</>
              ) : (
                <>
                  <RefreshCw className="w-5 h-5" />
                  실패 건 재발송
                </>
              )}
            </button>

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

      {/* 전체 고객 목록 */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">전체 고객 목록</h2>
          <button
            onClick={scheduleSelected}
            disabled={scheduling || selectedIds.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {scheduling ? (
              <>처리 중...</>
            ) : (
              <>
                <Send className="w-4 h-4" />
                선택한 {selectedIds.length}명 즉시 발송
              </>
            )}
          </button>
        </div>

        <div className="max-h-[500px] overflow-y-auto border rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === customers.length && customers.length > 0}
                    onChange={toggleAllSelection}
                    className="rounded border-gray-300"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">상태</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">회사명</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">담당자</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">이메일</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">발송일자</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {customers.map((customer) => (
                <tr key={customer.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(customer.id)}
                      onChange={() => toggleSelection(customer.id)}
                      className="rounded border-gray-300"
                    />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {getStatusBadge(customer.status)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                    {customer.company_name}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    {customer.ceo_name || '-'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    {customer.email}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(customer.sent_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {customers.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            등록된 고객이 없습니다.
          </div>
        )}
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
