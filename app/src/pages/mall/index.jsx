import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, List } from 'antd-mobile';
import { SearchOutline, ShoppingCartOutline } from 'antd-mobile-icons';
import useSWR from 'swr';
import './index.css';

const fetcher = (url) => fetch(url).then((res) => res.json());

const MallPage = () => {
  const navigate = useNavigate();
  const { data: items, error } = useSWR('https://api-u46fik5vcq-uc.a.run.app/api/mall_items', fetcher);
  const { data: cartData } = useSWR('https://api-u46fik5vcq-uc.a.run.app/api/cart', fetcher); // Assuming cart data endpoint

  const cartItemCount = cartData?.items?.length || 0;

  const renderItem = (item) => (
    <List.Item
      key={item.id}
      prefix={<img src={item.cover} alt={item.title} style={{ width: 60, height: 60, borderRadius: 8 }} />}
      description={<span>¥{item.price}</span>}
      onClick={() => navigate(`/mall/item/${item.id}`)}
    >
      {item.title}
    </List.Item>
  );

  return (
    <div className="mall-page">
      <div className="search-bar">
        <SearchOutline />
        <span className="search-placeholder">搜索康复好物、营养包...</span>
      </div>

      {error && <div>加载失败</div>}
      {!items && <div>加载中...</div>}
      {items && <List>{items.map(renderItem)}</List>}

      <div 
        className="fab-cart"
        style={{
          position: 'fixed',
          bottom: '80px', // Adjusted for nav bar
          right: '20px',
          zIndex: 1000,
        }}
      >
        <Badge content={cartItemCount > 0 ? cartItemCount : null}>
          <div 
            style={{
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              backgroundColor: '#1677ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            }}
            onClick={() => navigate('/mall/cart')}
          >
            <ShoppingCartOutline style={{ fontSize: 24 }} />
          </div>
        </Badge>
      </div>
    </div>
  );
};

export default MallPage;
