"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";

type Locale = "en" | "kh";

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations: Record<Locale, Record<string, string>> = {
  en: {
    "common.dashboard": "Dashboard",
    "common.prizes": "Prizes",
    "common.conditions": "Conditions",
    "common.resultControl": "Result Control",
    "common.settings": "Settings",
    "common.accounts": "Accounts",
    "common.adminUsers": "Admin Users",
    "common.spinHistory": "Spin History",
    "common.signOut": "Sign Out",
    "common.profile": "Profile",
    "common.search": "Search...",
    "common.notifications": "Notifications",
    "common.markAllRead": "Mark all read",
    "common.noNotifications": "No notifications yet",
    "common.menu": "Menu",
    "common.collapse": "Collapse",
    "common.spinManagement": "Spin Management",
    "common.setting": "Setting",
    "common.marketingManagement": "Marketing Management",
    "common.customersManagement": "Customers Management",
    "common.newCustomers": "New Customers",
    "common.oldCustomers": "Old Customers",
    "common.promotions": "Promotions",
    "common.team": "Team",
    "common.telegram": "Telegram",
    "common.telegramContacts": "Telegram Contacts",
    "common.roles": "Roles",
    "userManagement.title": "User Management",
    "userManagement.description": "Manage spin game accounts",
    "userManagement.addUser": "Add User",
    "userManagement.searchPlaceholder": "Search by name, username, or phone...",
    "userManagement.total": "Total",
    "userManagement.actions": "Actions",
    "userManagement.name": "Name",
    "userManagement.phone": "Phone",
    "userManagement.type": "Type",
    "userManagement.spinsLeft": "Spins Left",
    "userManagement.depositWithdraw": "Deposit/Withdraw",
    "userManagement.status": "Status",
    "userManagement.account": "Account",
    "userManagement.active": "Active",
    "userManagement.blocked": "Blocked",
    "userManagement.online": "Online",
    "userManagement.offline": "Offline",
    "userManagement.used": "Used",
    "userManagement.fixed": "Fixed",
    "userManagement.daily": "Daily",
    "userManagement.previous": "Previous",
    "userManagement.next": "Next",
    "dialogs.editUser": "Edit User",
    "dialogs.createUser": "Create New User",
    "dialogs.deleteUser": "Delete User",
    "dialogs.depositSpins": "Deposit Spins",
    "dialogs.withdrawSpins": "Withdraw Spins",
    "dialogs.cancel": "Cancel",
    "dialogs.delete": "Delete",
    "dialogs.deposit": "Deposit",
    "dialogs.withdraw": "Withdraw",
    "dialogs.update": "Update",
    "dialogs.create": "Create",
    "promotions.title": "Promotions",
    "promotions.description": "Manage your marketing promotions",
    "promotions.addPromotion": "Add Promotion",
    "promotions.editPromotion": "Edit Promotion",
    "promotions.activate": "Activate",
    "promotions.deactivate": "Deactivate",
    "promotions.close": "Close",
    "promotions.reopen": "Reopen",
  },
  kh: {
    "common.dashboard": "ផ្ទាំងគ្រប់គ្រង",
    "common.prizes": "រង្វាន់",
    "common.conditions": "លក្ខខណ្ឌ",
    "common.resultControl": "គ្រប់គ្រងលទ្ធផល",
    "common.settings": "ការកំណត់",
    "common.accounts": "គណនី",
    "common.adminUsers": "អ្នកគ្រប់គ្រង",
    "common.spinHistory": "ប្រវត្តិបង្វិល",
    "common.signOut": "ចាកចេញ",
    "common.profile": "ប្រវត្តិរូប",
    "common.search": "ស្វែងរក...",
    "common.notifications": "ការជូនដំណឹង",
    "common.markAllRead": "សម្គាល់ថាបានអានទាំងអស់",
    "common.noNotifications": "គ្មានការជូនដំណឹងទេ",
    "common.menu": "មីនុយ",
    "common.collapse": "បង្រួម",
    "common.spinManagement": "គ្រប់គ្រងបង្វិល",
    "common.setting": "ការកំណត់",
    "common.marketingManagement": "គ្រប់គ្រងទីផ្សារ",
    "common.customersManagement": "គ្រប់គ្រងអតិថះជន",
    "common.newCustomers": "អតិថះជនថ្មី",
    "common.oldCustomers": "អតិថះជនចាស់",
    "common.promotions": "ប្រូម៉ូស្យុង",
    "common.team": "ក្រុម",
    "common.telegram": "តេលេក្រាម",
    "common.telegramContacts": "ទំនាក់ទំនង Telegram",
    "common.roles": "តួនាទី",
    "userManagement.title": "គ្រប់គ្រងអ្នកប្រើប្រាស់",
    "userManagement.description": "គ្រប់គ្រងគណនីហ្គេមបង្វិល",
    "userManagement.addUser": "បង្កើតគណនី",
    "userManagement.searchPlaceholder": "ស្វែងរក...",
    "userManagement.total": "សរុប",
    "userManagement.actions": "សកម្មភាព",
    "userManagement.name": "ឈ្មោះ",
    "userManagement.phone": "ទូរស័ព្ទ",
    "userManagement.type": "ប្រភេទ",
    "userManagement.spinsLeft": "បង្វិលនៅសល់",
    "userManagement.depositWithdraw": "ដាក់ / ដក",
    "userManagement.status": "ស្ថានភាព",
    "userManagement.account": "គណនី",
    "userManagement.active": "សកម្ម",
    "userManagement.blocked": "បានរាំង",
    "userManagement.online": "លុប",
    "userManagement.offline": "ផ្តាច់",
    "userManagement.used": "បានប្រើ",
    "userManagement.fixed": "ថេរ",
    "userManagement.daily": "ប្រចាំថ្ងៃ",
    "userManagement.previous": "មុន",
    "userManagement.next": "បន្ទាប់",
    "dialogs.editUser": "កែប្រែអ្នកប្រើ",
    "dialogs.createUser": "បង្កើតអ្នកប្រើថ្មី",
    "dialogs.deleteUser": "លុបអ្នកប្រើ",
    "dialogs.depositSpins": "ដាក់បង្វិល",
    "dialogs.withdrawSpins": "ដកបង្វិល",
    "dialogs.cancel": "បោះបង់",
    "dialogs.delete": "លុប",
    "dialogs.deposit": "ដាក់",
    "dialogs.withdraw": "ដក",
    "dialogs.update": "ធ្វើបច្ចុប្បន្នភាព",
    "dialogs.create": "បង្កើត",
    "promotions.title": "ប្រូម៉ូស្យុង",
    "promotions.description": "គ្រប់គ្រងទីផ្សារ",
    "promotions.addPromotion": "បន្ថែមប្រូម៉ូស្យុង",
    "promotions.editPromotion": "កែប្រែប្រូម៉ូស្យុង",
    "promotions.activate": "ធ្វើសកម្ម",
    "promotions.deactivate": "ធ្វើអសកម្ម",
    "promotions.close": "បិទ",
    "promotions.reopen": "បើកឡើង",
  },
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    const saved = localStorage.getItem("locale") as Locale;
    if (saved && (saved === "en" || saved === "kh")) {
      setLocaleState(saved);
    }
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem("locale", newLocale);
    document.documentElement.lang = newLocale;
    document.documentElement.setAttribute("data-locale", newLocale);
  }, []);

  const t = useCallback((key: string): string => {
    return translations[locale][key] || key;
  }, [locale]);

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return context;
}