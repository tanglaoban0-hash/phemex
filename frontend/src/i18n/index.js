import { createI18n } from 'vue-i18n'

// 繁体中文（默认）
const zhHant = {
  nav: {
    home: '首頁',
    market: '行情',
    options: '秒合約',
    trade: '交易',
    assets: '資產',
    security: '安全'
  },
  login: {
    title: '歡迎登錄',
    subtitle: 'Phemex 專業交易平台',
    email: '郵箱地址',
    password: '登錄密碼',
    code: '驗證碼',
    sendCode: '發送驗證碼',
    loginBtn: '登錄',
    registerLink: '還沒有賬號？立即註冊',
    success: '登錄成功',
    passwordLogin: '密碼登錄',
    codeLogin: '驗證碼登錄'
  },
  register: {
    title: '創建賬號',
    subtitle: '開始您的專業交易之旅',
    username: '用戶名',
    email: '郵箱地址',
    password: '設置密碼',
    registerBtn: '註冊'
  },
  home: {
    title: 'Phemex',
    subtitle: '專業級數字資產交易平台',
    startTrade: '開始交易',
    registerNow: '立即註冊'
  },
  trade: {
    buy: '買入',
    sell: '賣出',
    available: '可用'
  },
  option: {
    up: '看漲',
    down: '看跌',
    confirmOrder: '確認下單'
  },
  assets: {
    recharge: '充值',
    withdraw: '提現'
  },
  common: {
    confirm: '確定',
    cancel: '取消',
    language: '語言',
    install: '下載APP',
    logout: '退出登錄',
    user: '用戶'
  }
}

// 简体中文
const zhHans = {
  nav: {
    home: '首页',
    market: '行情',
    options: '秒合约',
    trade: '交易',
    assets: '资产',
    security: '安全'
  },
  login: {
    title: '欢迎登录',
    subtitle: 'Phemex 专业交易平台',
    email: '邮箱地址',
    password: '登录密码',
    code: '验证码',
    sendCode: '发送验证码',
    loginBtn: '登录',
    registerLink: '还没有账号？立即注册',
    success: '登录成功',
    passwordLogin: '密码登录',
    codeLogin: '验证码登录'
  },
  register: {
    title: '创建账号',
    subtitle: '开始您的专业交易之旅',
    username: '用户名',
    email: '邮箱地址',
    password: '设置密码',
    registerBtn: '注册'
  },
  home: {
    title: 'Phemex',
    subtitle: '专业级数字资产交易平台',
    startTrade: '开始交易',
    registerNow: '立即注册'
  },
  trade: {
    buy: '买入',
    sell: '卖出',
    available: '可用'
  },
  option: {
    up: '看涨',
    down: '看跌',
    confirmOrder: '确认下单'
  },
  assets: {
    recharge: '充值',
    withdraw: '提现'
  },
  common: {
    confirm: '确定',
    cancel: '取消',
    language: '语言',
    install: '下载APP',
    logout: '退出登录',
    user: '用户'
  }
}

// 英文
const en = {
  nav: {
    home: 'Home',
    market: 'Market',
    options: 'Options',
    trade: 'Trade',
    assets: 'Assets',
    security: 'Security'
  },
  login: {
    title: 'Welcome Back',
    subtitle: 'Phemex Trading Platform',
    email: 'Email Address',
    password: 'Password',
    code: 'Verification Code',
    sendCode: 'Send Code',
    loginBtn: 'Login',
    registerLink: 'No account? Register now',
    success: 'Login successful',
    passwordLogin: 'Password',
    codeLogin: 'Verification Code'
  },
  register: {
    title: 'Create Account',
    subtitle: 'Start your trading journey',
    username: 'Username',
    email: 'Email Address',
    password: 'Password',
    registerBtn: 'Register'
  },
  home: {
    title: 'Phemex',
    subtitle: 'Professional Trading Platform',
    startTrade: 'Start Trading',
    registerNow: 'Register Now'
  },
  trade: {
    buy: 'Buy',
    sell: 'Sell',
    available: 'Available'
  },
  option: {
    up: 'Rise',
    down: 'Fall',
    confirmOrder: 'Confirm Order'
  },
  assets: {
    recharge: 'Deposit',
    withdraw: 'Withdraw'
  },
  common: {
    confirm: 'Confirm',
    cancel: 'Cancel',
    language: 'Language',
    install: 'Install App',
    logout: 'Logout',
    user: 'User'
  }
}

// 日文
const ja = {
  nav: {
    home: 'ホーム',
    market: '相場',
    options: 'オプション',
    trade: '取引',
    assets: '資産',
    security: 'セキュリティ'
  },
  login: {
    title: 'ログイン',
    subtitle: 'Phemex 取引プラットフォーム',
    email: 'メールアドレス',
    password: 'パスワード',
    code: '認証コード',
    sendCode: 'コード送信',
    loginBtn: 'ログイン',
    registerLink: 'アカウントをお持ちでない場合は登録',
    success: 'ログイン成功',
    passwordLogin: 'パスワード',
    codeLogin: '認証コード'
  },
  register: {
    title: 'アカウント作成',
    subtitle: '取引を始めましょう',
    username: 'ユーザー名',
    email: 'メールアドレス',
    password: 'パスワード',
    registerBtn: '登録'
  },
  home: {
    title: 'Phemex',
    subtitle: 'プロフェッショナル取引プラットフォーム',
    startTrade: '取引開始',
    registerNow: '今すぐ登録'
  },
  trade: {
    buy: '買い',
    sell: '売り',
    available: '利用可能'
  },
  option: {
    up: '上昇',
    down: '下降',
    confirmOrder: '注文確認'
  },
  assets: {
    recharge: '入金',
    withdraw: '出金'
  },
  common: {
    confirm: '確認',
    cancel: 'キャンセル',
    language: '言語',
    install: 'アプリをインストール',
    logout: 'ログアウト',
    user: 'ユーザー'
  }
}

// 韩文
const ko = {
  nav: {
    home: '홈',
    market: '시세',
    options: '옵션',
    trade: '거래',
    assets: '자산',
    security: '보안'
  },
  login: {
    title: '로그인',
    subtitle: 'Phemex 거래 플랫폼',
    email: '이메일 주소',
    password: '비밀번호',
    code: '인증 코드',
    sendCode: '코드 전송',
    loginBtn: '로그인',
    registerLink: '계정이 없으신가요? 등록하기',
    success: '로그인 성공',
    passwordLogin: '비밀번호',
    codeLogin: '인증 코드'
  },
  register: {
    title: '계정 생성',
    subtitle: '거래를 시작하세요',
    username: '사용자 이름',
    email: '이메일 주소',
    password: '비밀번호',
    registerBtn: '등록'
  },
  home: {
    title: 'Phemex',
    subtitle: '전문 디지털 자산 거래 플랫폼',
    startTrade: '거래 시작',
    registerNow: '지금 등록'
  },
  trade: {
    buy: '매수',
    sell: '매도',
    available: '사용 가능'
  },
  option: {
    up: '상승',
    down: '하띫',
    confirmOrder: '주문 확인'
  },
  assets: {
    recharge: '입금',
    withdraw: '출금'
  },
  common: {
    confirm: '확인',
    cancel: '취소',
    language: '언어',
    install: '앱 설치',
    logout: '로그아웃',
    user: '사용자'
  }
}

const i18n = createI18n({
  legacy: false,
  locale: localStorage.getItem('locale') || 'zhHant',
  fallbackLocale: 'zhHant',
  messages: {
    zhHant,
    zhHans,
    en,
    ja,
    ko
  }
})

export default i18n