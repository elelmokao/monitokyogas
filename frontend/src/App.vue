<template>
  <EnergyDashboard />
</template>

<script setup lang="ts">
import EnergyDashboard from './components/EnergyDashboard.vue';
</script>

<style>
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  line-height: 1.6;
  color: #334155;
  background: #f8fafc;
}

#app {
  margin: 0;
  padding: 0;
  width: 100%;
}

html, body {
  width: 100%;
  min-width: 0;
  margin: 0;
  padding: 0;
}
</style>