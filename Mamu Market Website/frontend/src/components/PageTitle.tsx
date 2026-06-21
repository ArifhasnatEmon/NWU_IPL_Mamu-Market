import React, { useEffect } from 'react';

interface PageTitleProps {
  title: string;
}

const PageTitle: React.FC<PageTitleProps> = ({ title }) => {
  useEffect(() => {
    document.title = title === 'Mamu Market' ? title : `${title} - Mamu Market`;
  }, [title]);

  return null;
};

export default PageTitle;
