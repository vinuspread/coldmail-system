'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Trash2, Edit, Plus, Search } from 'lucide-react';

interface Customer {
  id: number;
  company_name: string;
  ceo_name: string;
  email: string;
  status: string;
  sent_at?: string;
  fail_reason?: string;
  memo?: string;
  biz_type?: string;
  phone?: string;
  address?: string;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingMemo, setEditingMemo] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // 신규 고객 폼
  const [newCustomer, setNewCustomer] = useState({
    company_name: '',
    ceo_name: '',
    email: '',
    memo: '',
    biz_type: '',
    phone: '',
    address: '',
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    // 검색 필터링
    if (searchQuery.trim() === '') {
      setFilteredCustomers(customers);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredCustomers(
        customers.filter(
          (c) =>
            c.company_name.toLowerCase().includes(query) ||
            c.email.toLowerCase().includes(query) ||
            (c.biz_type && c.biz_type.toLowerCase().includes(query))
        )
      );
    }
  }, [searchQuery, customers]);

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('id', { ascending: false });

      if (error) throw error;
      setCustomers(data || []);
      setFilteredCustomers(data || []);
    } catch (error: any) {
      alert('❌ 고객 조회 실패: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const addCustomer = async () => {
    if (!newCustomer.company_name || !newCustomer.email) {
      alert('회사명과 이메일은 필수입니다!');
      return;
    }

    try {
      const { error } = await supabase.from('customers').insert([
        {
          ...newCustomer,
          status: 'ready',
        },
      ]);

      if (error) throw error;

      setNewCustomer({ company_name: '', ceo_name: '', email: '', memo: '', biz_type: '', phone: '', address: '' });
      fetchCustomers();
    } catch (error: any) {
      alert('❌ 추가 실패: ' + error.message);
    }
  };

  const deleteCustomer = async (id: number, companyName: string) => {
    if (!confirm(`정말로 "${companyName}"를 삭제하시겠습니까?`)) return;

    try {
      const { error } = await supabase.from('customers').delete().eq('id', id);

      if (error) throw error;

      fetchCustomers();
    } catch (error: any) {
      alert('❌ 삭제 실패: ' + error.message);
    }
  };

  const updateMemo = async (id: number, newMemo: string) => {
    try {
      const { error } = await supabase
        .from('customers')
        .update({ memo: newMemo })
        .eq('id', id);

      if (error) throw error;

      setEditingMemo(null);
      fetchCustomers();
    } catch (error: any) {
      alert('❌ 메모 수정 실패: ' + error.message);
    }
  };

  const toggleSelection = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredCustomers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredCustomers.map((c) => c.id));
    }
  };

  const deleteBulk = async () => {
    if (selectedIds.length === 0) {
      alert('삭제할 고객을 선택해주세요.');
      return;
    }

    if (!confirm(`선택한 ${selectedIds.length}명의 고객을 삭제하시겠습니까?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .in('id', selectedIds);

      if (error) throw error;

      setSelectedIds([]);
      fetchCustomers();
    } catch (error: any) {
      alert('❌ 일괄 삭제 실패: ' + error.message);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      ready: 'bg-yellow-100 text-yellow-800',
      sent: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
    };
    const labels = {
      ready: '대기',
      sent: '완료',
      failed: '실패',
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded ${styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800'}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    );
  };

  if (loading) {
    return <div className="text-center py-8">로딩 중...</div>;
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">고객 관리</h1>
        <p className="mt-2 text-sm text-gray-600">
          총 {customers.length}명의 고객
        </p>
      </div>

      {/* 빠른 고객 등록 섹션 */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow-md p-6 border border-blue-100">
        <div className="flex items-center gap-2 mb-4">
          <Plus className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">빠른 고객 등록</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="회사명 *"
            value={newCustomer.company_name}
            onChange={(e) =>
              setNewCustomer({ ...newCustomer, company_name: e.target.value })
            }
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          />
          <input
            type="email"
            placeholder="이메일 *"
            value={newCustomer.email}
            onChange={(e) =>
              setNewCustomer({ ...newCustomer, email: e.target.value })
            }
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          />
          <input
            type="text"
            placeholder="대표자명"
            value={newCustomer.ceo_name}
            onChange={(e) =>
              setNewCustomer({ ...newCustomer, ceo_name: e.target.value })
            }
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          />
          <input
            type="text"
            placeholder="업종"
            value={newCustomer.biz_type}
            onChange={(e) =>
              setNewCustomer({ ...newCustomer, biz_type: e.target.value })
            }
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          />
          <input
            type="text"
            placeholder="연락처"
            value={newCustomer.phone}
            onChange={(e) =>
              setNewCustomer({ ...newCustomer, phone: e.target.value })
            }
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          />
          <input
            type="text"
            placeholder="주소"
            value={newCustomer.address}
            onChange={(e) =>
              setNewCustomer({ ...newCustomer, address: e.target.value })
            }
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          />
          <input
            type="text"
            placeholder="메모"
            value={newCustomer.memo}
            onChange={(e) =>
              setNewCustomer({ ...newCustomer, memo: e.target.value })
            }
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white md:col-span-2 lg:col-span-3"
          />
        </div>
        <div className="mt-4">
          <button
            onClick={addCustomer}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
          >
            저장
          </button>
        </div>
      </div>

      {/* 구분선 */}
      <hr className="border-gray-300" />

      {/* 고객 목록 섹션 */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">고객 목록</h2>
        
        {/* 검색창 및 일괄 삭제 버튼 */}
        <div className="flex gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="회사명, 이메일, 업종으로 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          {selectedIds.length > 0 && (
            <button
              onClick={deleteBulk}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium shadow-sm flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              선택 삭제 ({selectedIds.length})
            </button>
          )}
        </div>
      </div>

      {/* 고객 테이블 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={filteredCustomers.length > 0 && selectedIds.length === filteredCustomers.length}
                  onChange={toggleSelectAll}
                  className="rounded border-gray-300 cursor-pointer"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                회사명
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                대표자
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                이메일
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                업종
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                연락처
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                상태
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                메모
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                작업
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredCustomers.map((customer) => (
              <tr key={customer.id} className="hover:bg-gray-50">
                <td className="px-4 py-4 text-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(customer.id)}
                    onChange={() => toggleSelection(customer.id)}
                    className="rounded border-gray-300 cursor-pointer"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {customer.company_name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {customer.ceo_name || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {customer.email}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {customer.biz_type || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {customer.phone || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(customer.status)}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {editingMemo === customer.id ? (
                    <input
                      type="text"
                      defaultValue={customer.memo || ''}
                      onBlur={(e) => updateMemo(customer.id, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          updateMemo(customer.id, e.currentTarget.value);
                        }
                      }}
                      className="px-2 py-1 border rounded"
                      autoFocus
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <span>{customer.memo || '-'}</span>
                      <button
                        onClick={() => setEditingMemo(customer.id)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <button
                    onClick={() => deleteCustomer(customer.id, customer.company_name)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredCustomers.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          {searchQuery ? '검색 결과가 없습니다.' : '등록된 고객이 없습니다.'}
        </div>
      )}
    </div>
  );
}

