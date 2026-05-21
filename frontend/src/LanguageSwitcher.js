import React from 'react';
import { useTranslation } from 'react-i18next';

/**
 * A simple dropdown component to switch between supported languages.
 */
const LanguageSwitcher = () => {
  const { i18n, t } = useTranslation();

  const handleLanguageChange = (event) => {
    const newLang = event.target.value;
    i18n.changeLanguage(newLang);
    // Note: You can also trigger a backend API call here to save this preference 
    // to the 'language' column in your User model.
  };

  return (
    <div className="flex items-center space-x-2 p-2 bg-white rounded shadow-sm border border-gray-200">
      <label htmlFor="lang-select" className="text-sm font-medium text-gray-600">
        {t('language')}:
      </label>
      <select
        id="lang-select"
        value={i18n.language}
        onChange={handleLanguageChange}
        className="text-sm border-none bg-transparent focus:ring-0 cursor-pointer"
      >
        <option value="en">{t('english')}</option>
        <option value="zh-TW">{t('traditional_chinese')}</option>
      </select>
    </div>
  );
};

export default LanguageSwitcher;