<template>
  <admin-layout>
    <account-overview-hearts v-if="memberChrome" />
    <div v-else class="grid grid-cols-12 gap-4 md:gap-6">
      <div class="col-span-12 space-y-6 xl:col-span-7">
        <ecommerce-metrics />
        <monthly-target />
      </div>
      <div class="col-span-12 xl:col-span-5">
        <monthly-sale />
      </div>

      <div class="col-span-12">
        <statistics-chart />
      </div>

      <div class="col-span-12 xl:col-span-5">
        <customer-demographic />
      </div>

      <div class="col-span-12 xl:col-span-7">
        <recent-orders />
      </div>
    </div>
  </admin-layout>
</template>

<script>
import AdminLayout from '../components/layout/AdminLayout.vue'
import AccountOverviewHearts from '../components/huajaiy/AccountOverviewHearts.vue'
import EcommerceMetrics from '../components/ecommerce/EcommerceMetrics.vue'
import MonthlyTarget from '../components/ecommerce/MonthlySale.vue'
import MonthlySale from '../components/ecommerce/MonthlyTarget.vue'
import CustomerDemographic from '../components/ecommerce/CustomerDemographic.vue'
import StatisticsChart from '../components/ecommerce/StatisticsChart.vue'
import RecentOrders from '../components/ecommerce/RecentOrders.vue'
export default {
  components: {
    AdminLayout,
    AccountOverviewHearts,
    EcommerceMetrics,
    MonthlyTarget,
    MonthlySale,
    CustomerDemographic,
    StatisticsChart,
    RecentOrders,
  },
  name: 'Ecommerce',
  data() {
    return {
      memberChrome:
        typeof document !== 'undefined' &&
        document.documentElement.classList.contains('huajaiy-member-chrome'),
      _memberChromeObserver: null,
    }
  },
  mounted() {
    const el = document.documentElement
    const sync = () => {
      this.memberChrome = el.classList.contains('huajaiy-member-chrome')
    }
    sync()
    this._memberChromeObserver = new MutationObserver(sync)
    this._memberChromeObserver.observe(el, {
      attributes: true,
      attributeFilter: ['class'],
    })
  },
  unmounted() {
    if (this._memberChromeObserver) {
      this._memberChromeObserver.disconnect()
      this._memberChromeObserver = null
    }
  },
}
</script>
