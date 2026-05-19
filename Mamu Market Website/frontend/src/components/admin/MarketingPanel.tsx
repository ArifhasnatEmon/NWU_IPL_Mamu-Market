import React from 'react';
import FlashDealsTab from './marketing/FlashDealsTab';
import CategoryManagementTab from './marketing/CategoryManagementTab';
import PromoCodesTab from './marketing/PromoCodesTab';
import HeroBannersTab from './marketing/HeroBannersTab';
import TopTickerTab from './marketing/TopTickerTab';

interface MarketingPanelProps {
  activeTab: string;
  setToast: (msg: string) => void;
  refreshData: () => void;
}

const MarketingPanel: React.FC<MarketingPanelProps> = ({ activeTab, setToast, refreshData }) => {
  React.useEffect(() => {
    // Queue check disabled — no backend
  }, []);

  return (
    <>
      {activeTab === 'Flash Deals' && <FlashDealsTab setToast={setToast} />}
      {activeTab === 'Category Management' && <CategoryManagementTab setToast={setToast} />}
      {activeTab === 'Promo Codes' && <PromoCodesTab setToast={setToast} refreshData={refreshData} />}
      {activeTab === 'Hero Banners' && <HeroBannersTab setToast={setToast} />}
      {activeTab === 'Top Ticker' && <TopTickerTab setToast={setToast} />}
    </>
  );
};

export default MarketingPanel;
