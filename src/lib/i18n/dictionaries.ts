// Lightweight i18n dictionaries for SAP Migrator. Covers the global app chrome
// (navigation, user menu, auth flow, common actions). Pure data + a translate()
// helper so it is unit-testable and easy to extend with more keys.

export type Locale = 'en' | 'de' | 'fr' | 'af' | 'ar'

export interface LocaleMeta { code: Locale; label: string; dir: 'ltr' | 'rtl' }

export const LOCALES: LocaleMeta[] = [
  { code: 'en', label: 'English', dir: 'ltr' },
  { code: 'de', label: 'Deutsch', dir: 'ltr' },
  { code: 'fr', label: 'Français', dir: 'ltr' },
  { code: 'af', label: 'Afrikaans', dir: 'ltr' },
  { code: 'ar', label: 'العربية', dir: 'rtl' },
]

export const DEFAULT_LOCALE: Locale = 'en'

export type TranslationKey =
  | 'nav.dashboard' | 'nav.projects' | 'nav.catalog' | 'nav.insights' | 'nav.activity' | 'nav.settings'
  | 'nav.search' | 'nav.signOut'
  | 'common.save' | 'common.cancel' | 'common.create' | 'common.delete' | 'common.export' | 'common.loading'
  | 'auth.welcomeBack' | 'auth.signInSubtitle' | 'auth.email' | 'auth.password' | 'auth.signIn'
  | 'auth.signingIn' | 'auth.forgotPassword' | 'auth.noAccount' | 'auth.createWorkspace' | 'auth.invalidCredentials'
  | 'settings.title' | 'settings.subtitle' | 'settings.language' | 'settings.languageDesc'

type Dict = Record<TranslationKey, string>

const en: Dict = {
  'nav.dashboard': 'Dashboard', 'nav.projects': 'Projects', 'nav.catalog': 'Catalog',
  'nav.insights': 'Insights', 'nav.activity': 'Activity', 'nav.settings': 'Settings',
  'nav.search': 'Search…', 'nav.signOut': 'Sign out',
  'common.save': 'Save', 'common.cancel': 'Cancel', 'common.create': 'Create', 'common.delete': 'Delete',
  'common.export': 'Export', 'common.loading': 'Loading…',
  'auth.welcomeBack': 'Welcome back', 'auth.signInSubtitle': 'Sign in to your SAP Migrator workspace',
  'auth.email': 'Email', 'auth.password': 'Password', 'auth.signIn': 'Sign in', 'auth.signingIn': 'Signing in…',
  'auth.forgotPassword': 'Forgot password?', 'auth.noAccount': 'No account?',
  'auth.createWorkspace': 'Create a free workspace', 'auth.invalidCredentials': 'Invalid email or password',
  'settings.title': 'Settings', 'settings.subtitle': 'Manage your workspace and team',
  'settings.language': 'Language', 'settings.languageDesc': 'Choose your preferred language',
}

const de: Dict = {
  'nav.dashboard': 'Dashboard', 'nav.projects': 'Projekte', 'nav.catalog': 'Katalog',
  'nav.insights': 'Einblicke', 'nav.activity': 'Aktivität', 'nav.settings': 'Einstellungen',
  'nav.search': 'Suchen…', 'nav.signOut': 'Abmelden',
  'common.save': 'Speichern', 'common.cancel': 'Abbrechen', 'common.create': 'Erstellen', 'common.delete': 'Löschen',
  'common.export': 'Exportieren', 'common.loading': 'Wird geladen…',
  'auth.welcomeBack': 'Willkommen zurück', 'auth.signInSubtitle': 'Melden Sie sich bei Ihrem SAP Migrator-Arbeitsbereich an',
  'auth.email': 'E-Mail', 'auth.password': 'Passwort', 'auth.signIn': 'Anmelden', 'auth.signingIn': 'Anmeldung…',
  'auth.forgotPassword': 'Passwort vergessen?', 'auth.noAccount': 'Kein Konto?',
  'auth.createWorkspace': 'Kostenlosen Arbeitsbereich erstellen', 'auth.invalidCredentials': 'Ungültige E-Mail oder Passwort',
  'settings.title': 'Einstellungen', 'settings.subtitle': 'Verwalten Sie Ihren Arbeitsbereich und Ihr Team',
  'settings.language': 'Sprache', 'settings.languageDesc': 'Wählen Sie Ihre bevorzugte Sprache',
}

const fr: Dict = {
  'nav.dashboard': 'Tableau de bord', 'nav.projects': 'Projets', 'nav.catalog': 'Catalogue',
  'nav.insights': 'Analyses', 'nav.activity': 'Activité', 'nav.settings': 'Paramètres',
  'nav.search': 'Rechercher…', 'nav.signOut': 'Se déconnecter',
  'common.save': 'Enregistrer', 'common.cancel': 'Annuler', 'common.create': 'Créer', 'common.delete': 'Supprimer',
  'common.export': 'Exporter', 'common.loading': 'Chargement…',
  'auth.welcomeBack': 'Bon retour', 'auth.signInSubtitle': 'Connectez-vous à votre espace SAP Migrator',
  'auth.email': 'E-mail', 'auth.password': 'Mot de passe', 'auth.signIn': 'Se connecter', 'auth.signingIn': 'Connexion…',
  'auth.forgotPassword': 'Mot de passe oublié ?', 'auth.noAccount': 'Pas de compte ?',
  'auth.createWorkspace': 'Créer un espace gratuit', 'auth.invalidCredentials': 'E-mail ou mot de passe invalide',
  'settings.title': 'Paramètres', 'settings.subtitle': 'Gérez votre espace et votre équipe',
  'settings.language': 'Langue', 'settings.languageDesc': 'Choisissez votre langue préférée',
}

const af: Dict = {
  'nav.dashboard': 'Paneelbord', 'nav.projects': 'Projekte', 'nav.catalog': 'Katalogus',
  'nav.insights': 'Insigte', 'nav.activity': 'Aktiwiteit', 'nav.settings': 'Instellings',
  'nav.search': 'Soek…', 'nav.signOut': 'Meld af',
  'common.save': 'Stoor', 'common.cancel': 'Kanselleer', 'common.create': 'Skep', 'common.delete': 'Vee uit',
  'common.export': 'Voer uit', 'common.loading': 'Laai tans…',
  'auth.welcomeBack': 'Welkom terug', 'auth.signInSubtitle': 'Meld aan by jou SAP Migrator-werkruimte',
  'auth.email': 'E-pos', 'auth.password': 'Wagwoord', 'auth.signIn': 'Meld aan', 'auth.signingIn': 'Meld aan…',
  'auth.forgotPassword': 'Wagwoord vergeet?', 'auth.noAccount': 'Geen rekening nie?',
  'auth.createWorkspace': "Skep 'n gratis werkruimte", 'auth.invalidCredentials': 'Ongeldige e-pos of wagwoord',
  'settings.title': 'Instellings', 'settings.subtitle': 'Bestuur jou werkruimte en span',
  'settings.language': 'Taal', 'settings.languageDesc': 'Kies jou voorkeurtaal',
}

const ar: Dict = {
  'nav.dashboard': 'لوحة التحكم', 'nav.projects': 'المشاريع', 'nav.catalog': 'الكتالوج',
  'nav.insights': 'التحليلات', 'nav.activity': 'النشاط', 'nav.settings': 'الإعدادات',
  'nav.search': 'بحث…', 'nav.signOut': 'تسجيل الخروج',
  'common.save': 'حفظ', 'common.cancel': 'إلغاء', 'common.create': 'إنشاء', 'common.delete': 'حذف',
  'common.export': 'تصدير', 'common.loading': 'جارٍ التحميل…',
  'auth.welcomeBack': 'مرحبًا بعودتك', 'auth.signInSubtitle': 'سجّل الدخول إلى مساحة عمل SAP Migrator',
  'auth.email': 'البريد الإلكتروني', 'auth.password': 'كلمة المرور', 'auth.signIn': 'تسجيل الدخول', 'auth.signingIn': 'جارٍ تسجيل الدخول…',
  'auth.forgotPassword': 'هل نسيت كلمة المرور؟', 'auth.noAccount': 'ليس لديك حساب؟',
  'auth.createWorkspace': 'أنشئ مساحة عمل مجانية', 'auth.invalidCredentials': 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
  'settings.title': 'الإعدادات', 'settings.subtitle': 'إدارة مساحة العمل والفريق',
  'settings.language': 'اللغة', 'settings.languageDesc': 'اختر لغتك المفضلة',
}

export const dictionaries: Record<Locale, Dict> = { en, de, fr, af, ar }

/** Translate a key for a locale, falling back to English, then the key itself. */
export function translate(locale: Locale, key: TranslationKey): string {
  return dictionaries[locale]?.[key] ?? dictionaries.en[key] ?? key
}

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && LOCALES.some((l) => l.code === value)
}

export function dirFor(locale: Locale): 'ltr' | 'rtl' {
  return LOCALES.find((l) => l.code === locale)?.dir ?? 'ltr'
}
