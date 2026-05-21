import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      "welcome": "Welcome to AI Pentest",
      "language": "Language",
      "english": "English",
      "traditional_chinese": "繁體中文",
      "chat_placeholder": "Ask the AI a security question..."
    }
  },
  'zh-TW': {
    translation: {
      "welcome": "歡迎使用 AI 滲透測試平台",
      "language": "語言",
      "english": "英文",
      "traditional_chinese": "繁體中文",
      "chat_placeholder": "向 AI 諮詢安全問題..."
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "en", // default language
    fallbackLng: "en",
  });

export default i18n;