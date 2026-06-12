<template>
  <svg
    viewBox="0 0 32 32"
    class="select-none inline-block align-middle"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <!-- Outer Gold Rim -->
    <circle cx="16" cy="16" r="14" fill="url(#coinGradOuter)" stroke="#D97706" stroke-width="1"/>
    <!-- Inner Coin Face -->
    <circle cx="16" cy="16" r="11" fill="url(#coinGradInner)" stroke="#B45309" stroke-width="0.75"/>
    
    <!-- Light Reflection Shine -->
    <path
      d="M7 16 C 7 11, 11 7, 16 7"
      stroke="#FFFFFF"
      stroke-width="1.25"
      stroke-linecap="round"
      opacity="0.55"
    />
    <path
      d="M16 25 C 21 25, 25 21, 25 16"
      stroke="#FFFFFF"
      stroke-width="0.75"
      stroke-linecap="round"
      opacity="0.25"
    />

    <!-- Dollar Symbol ($) in Center -->
    <text
      x="16"
      y="21.5"
      font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
      font-weight="900"
      font-size="15"
      fill="#FFFFFF"
      text-anchor="middle"
      style="user-select: none; pointer-events: none; text-shadow: 0px 1px 1.5px rgba(180, 83, 9, 0.8);"
    >$</text>

    <defs>
      <linearGradient id="coinGradOuter" x1="2" y1="2" x2="30" y2="30" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#FDE047"/>
        <stop offset="40%" stop-color="#F59E0B"/>
        <stop offset="100%" stop-color="#B45309"/>
      </linearGradient>
      <linearGradient id="coinGradInner" x1="5" y1="5" x2="27" y2="27" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#FCD34D"/>
        <stop offset="50%" stop-color="#F59E0B"/>
        <stop offset="100%" stop-color="#92400E"/>
      </linearGradient>
    </defs>
  </svg>
</template>

<script setup lang="ts">
// Simple static SVG coin icon component
</script>
