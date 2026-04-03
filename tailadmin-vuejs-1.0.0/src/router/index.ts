import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior(to, from, savedPosition) {
    return savedPosition || { left: 0, top: 0 }
  },
  routes: [
    {
      path: '/',
      name: 'Ecommerce',
      component: () => import('../views/Ecommerce.vue'),
      meta: {
        title: 'ภาพรวมบัญชี',
        huajaiyMember: true,
      },
    },
    {
      path: '/calendar',
      name: 'Calendar',
      component: () => import('../views/Others/Calendar.vue'),
      meta: {
        title: 'Calendar',
      },
    },
    {
      path: '/profile',
      name: 'Profile',
      component: () => import('../views/Others/UserProfile.vue'),
      meta: {
        title: 'โปรไฟล์',
        huajaiyMember: true,
      },
    },
    {
      path: '/my-prizes',
      name: 'MyPrizes',
      component: () => import('../views/huajaiy/MemberMyPrizesPage.vue'),
      meta: { title: 'รางวัลของฉัน', huajaiyMember: true },
    },
    {
      path: '/my-hearts',
      name: 'MyHearts',
      component: () => import('../views/huajaiy/MemberSectionPage.vue'),
      meta: { title: 'หัวใจของฉัน', huajaiyMember: true },
    },
    {
      path: '/my-games',
      name: 'MyGames',
      component: () => import('../views/huajaiy/MemberMyGamesPage.vue'),
      meta: { title: 'เกมของฉัน', huajaiyMember: true },
    },
    {
      path: '/create-game',
      name: 'MemberCreateGame',
      component: () => import('../views/huajaiy/MemberCreateGameEmbedPage.vue'),
      meta: { title: 'สร้างเกมใหม่', huajaiyMember: true },
    },
    {
      path: '/game-studio',
      name: 'MemberGameStudio',
      component: () => import('../views/huajaiy/MemberGameStudioPage.vue'),
      meta: { title: 'ตั้งค่าห้องเกม', huajaiyMember: true },
    },
    {
      path: '/my-shops',
      name: 'MyShops',
      component: () => import('../views/huajaiy/MemberSectionPage.vue'),
      meta: { title: 'ร้านค้าของฉัน', huajaiyMember: true },
    },
    {
      path: '/my-orders',
      name: 'MyOrders',
      component: () => import('../views/huajaiy/MemberSectionPage.vue'),
      meta: { title: 'คำสั่งซื้อ', huajaiyMember: true },
    },
    {
      path: '/prize-withdraw-request',
      name: 'PrizeWithdrawRequest',
      component: () => import('../views/huajaiy/MemberCreatorWithdrawalsPage.vue'),
      meta: { title: 'คำขอรับรางวัล', huajaiyMember: true },
    },
    {
      path: '/hearts-top-up',
      name: 'HeartsTopUp',
      component: () => import('../views/huajaiy/MemberHeartsTopUpPage.vue'),
      meta: { title: 'เติมหัวใจแดง', huajaiyMember: true },
    },
    {
      path: '/give-hearts',
      name: 'GiveHearts',
      component: () => import('../views/huajaiy/MemberGiveHeartsPage.vue'),
      meta: { title: 'แจกหัวใจแดง', huajaiyMember: true },
    },
    {
      path: '/form-elements',
      name: 'Form Elements',
      component: () => import('../views/Forms/FormElements.vue'),
      meta: {
        title: 'Form Elements',
      },
    },
    {
      path: '/basic-tables',
      name: 'Basic Tables',
      component: () => import('../views/Tables/BasicTables.vue'),
      meta: {
        title: 'Basic Tables',
      },
    },
    {
      path: '/line-chart',
      name: 'Line Chart',
      component: () => import('../views/Chart/LineChart/LineChart.vue'),
    },
    {
      path: '/bar-chart',
      name: 'Bar Chart',
      component: () => import('../views/Chart/BarChart/BarChart.vue'),
    },
    {
      path: '/alerts',
      name: 'Alerts',
      component: () => import('../views/UiElements/Alerts.vue'),
      meta: {
        title: 'Alerts',
      },
    },
    {
      path: '/avatars',
      name: 'Avatars',
      component: () => import('../views/UiElements/Avatars.vue'),
      meta: {
        title: 'Avatars',
      },
    },
    {
      path: '/badge',
      name: 'Badge',
      component: () => import('../views/UiElements/Badges.vue'),
      meta: {
        title: 'Badge',
      },
    },

    {
      path: '/buttons',
      name: 'Buttons',
      component: () => import('../views/UiElements/Buttons.vue'),
      meta: {
        title: 'Buttons',
      },
    },

    {
      path: '/images',
      name: 'Images',
      component: () => import('../views/UiElements/Images.vue'),
      meta: {
        title: 'Images',
      },
    },
    {
      path: '/videos',
      name: 'Videos',
      component: () => import('../views/UiElements/Videos.vue'),
      meta: {
        title: 'Videos',
      },
    },
    {
      path: '/blank',
      name: 'Blank',
      component: () => import('../views/Pages/BlankPage.vue'),
      meta: {
        title: 'Blank',
      },
    },

    {
      path: '/error-404',
      name: '404 Error',
      component: () => import('../views/Errors/FourZeroFour.vue'),
      meta: {
        title: '404 Error',
      },
    },

    {
      path: '/signin',
      name: 'Signin',
      component: () => import('../views/Auth/Signin.vue'),
      meta: {
        title: 'Signin',
      },
    },
    {
      path: '/signup',
      name: 'Signup',
      component: () => import('../views/Auth/Signup.vue'),
      meta: {
        title: 'Signup',
      },
    },
  ],
})

export default router

router.beforeEach((to, from, next) => {
  if (to.meta.huajaiyMember && typeof to.meta.title === 'string') {
    document.title = `${to.meta.title} | HUAJAIY`
  } else {
    document.title = `${to.meta.title || 'Page'} | HUAJAIY`
  }
  next()
})
