import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Spin, Result } from 'antd';
import { NavBar } from 'antd-mobile';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.DEV ? "/api" : "https://api-u46fik5vcq-uc.a.run.app/api";

const ProtocolPage = () => {
  const { key } = useParams();
  const navigate = useNavigate();
  const [protocol, setProtocol] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProtocol = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_URL}/protocols/key/${key}`);
        if (response.ok) {
          const data = await response.json();
          setProtocol(data);
        } else {
          throw new Error('协议加载失败');
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (key) {
      fetchProtocol();
    }
  }, [key]);

  const getTitle = () => {
    if (key === 'service-agreement') return '服务协议';
    if (key === 'privacy-policy') return '隐私政策';
    return '协议详情';
  };

  return (
    <div>
      <NavBar onBack={() => navigate(-1)}>{getTitle()}</NavBar>
      <div style={{ padding: '16px' }}>
        {loading && <Spin size="large" />}
        {error && <Result status="error" title="加载失败" subTitle={error} />}
        {protocol && (
          <div dangerouslySetInnerHTML={{ __html: protocol.content }} />
        )}
      </div>
    </div>
  );
};

export default ProtocolPage;
