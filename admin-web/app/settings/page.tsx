'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Save, Copy, Check } from 'lucide-react';

export default function SettingsPage() {
  const [config, setConfig] = useState({
    email_subject: '',
    email_template: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copiedVar, setCopiedVar] = useState<string | null>(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('app_config')
        .select('email_subject, email_template')
        .eq('id', 1)
        .single();

      if (error) throw error;

      if (data) {
        setConfig({
          email_subject: data.email_subject || '',
          email_template: data.email_template || '',
        });
      }
    } catch (error: any) {
      alert('❌ 설정 로딩 실패: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('app_config')
        .update({
          email_subject: config.email_subject,
          email_template: config.email_template,
        })
        .eq('id', 1);

      if (error) throw error;

      alert('✅ 설정이 저장되었습니다!');
    } catch (error: any) {
      alert('❌ 저장 실패: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text: string, varName: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedVar(varName);
      setTimeout(() => setCopiedVar(null), 2000);
    });
  };

  if (loading) {
    return <div className="text-center py-8">로딩 중...</div>;
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">이메일 설정</h1>
        <p className="mt-2 text-sm text-gray-600">
          발송될 이메일의 제목과 내용을 설정하세요.
        </p>
      </div>

      {/* 설정 폼 */}
      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        {/* 이메일 제목 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            이메일 제목
          </label>
          <input
            type="text"
            value={config.email_subject}
            onChange={(e) =>
              setConfig({ ...config, email_subject: e.target.value })
            }
            placeholder="예: 귀사의 성장을 위한 제안서"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* 이메일 본문 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            이메일 본문
          </label>
          <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-900 mb-2 font-medium">
              💡 사용 가능한 변수 (클릭하면 복사됩니다):
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => copyToClipboard('{{company_name}}', 'company_name')}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-blue-300 rounded-md hover:bg-blue-50 transition-colors text-xs font-mono"
              >
                {'{{company_name}}'}
                {copiedVar === 'company_name' ? (
                  <Check className="w-3 h-3 text-green-600" />
                ) : (
                  <Copy className="w-3 h-3 text-gray-500" />
                )}
              </button>
              <button
                type="button"
                onClick={() => copyToClipboard('{{ceo_name}}', 'ceo_name')}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-blue-300 rounded-md hover:bg-blue-50 transition-colors text-xs font-mono"
              >
                {'{{ceo_name}}'}
                {copiedVar === 'ceo_name' ? (
                  <Check className="w-3 h-3 text-green-600" />
                ) : (
                  <Copy className="w-3 h-3 text-gray-500" />
                )}
              </button>
            </div>
          </div>
          <textarea
            value={config.email_template}
            onChange={(e) =>
              setConfig({ ...config, email_template: e.target.value })
            }
            placeholder={`안녕하세요, {{company_name}} {{ceo_name}}님.

저희는 귀사의 성장을 돕는 솔루션을 제공하고 있습니다.

자세한 내용은 회신 부탁드립니다.

감사합니다.`}
            rows={12}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
          />
        </div>

        {/* 미리보기 */}
        <div className="border-t pt-6">
          <h3 className="text-sm font-medium text-gray-700 mb-2">미리보기 (실제 이메일 화면)</h3>
          <div className="bg-gray-100 border border-gray-300 rounded-lg p-4">
            <div className="text-sm font-semibold text-gray-900 mb-3 pb-2 bg-white px-3 py-2 rounded border-b border-gray-200">
              📧 제목: {config.email_subject || '(제목 없음)'}
            </div>
            <iframe
              srcDoc={
                config.email_template
                  .replace(/{{company_name}}/g, '<strong>홍길동컴퍼니</strong>')
                  .replace(/{{ceo_name}}/g, '<strong>홍길동</strong>') || 
                '<div style="padding: 20px; color: #999; text-align: center;">(내용 없음)</div>'
              }
              className="w-full border-0 bg-white rounded"
              style={{ minHeight: '600px', height: 'auto' }}
              title="이메일 미리보기"
            />
          </div>
        </div>

        {/* 저장 버튼 */}
        <div className="flex justify-end">
          <button
            onClick={saveConfig}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            {saving ? '저장 중...' : '설정 저장'}
          </button>
        </div>
      </div>
    </div>
  );
}

