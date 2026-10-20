<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { mwnfLinks, useI18n } from '@museumwnf/viewer-core'
import { SocialLinks, mwnfSocialLinks } from '@museumwnf/viewer-layout'

// Legacy's footer (explore-client App.vue), and nothing else (Pascal,
// 2026-10-20: copy legacy): MWNF's links and this site's, in its order, the
// language policy and the copyright line, then "Follow us" with legacy's six
// social networks. MWNF's pages open in a new tab, as legacy's did.
const { t } = useI18n()
const router = useRouter()

const site = (to) => ({ href: router.resolve(to).href, external: false })
const mwnf = (href) => ({ href, external: true })

const links = computed(() => [
  { label: t('explore.footer.mwnfHome'), ...mwnf(mwnfLinks.portal) },
  { label: t('core.nav.home'), ...site({ name: 'home' }) },
  { label: t('core.nav.about'), ...mwnf(mwnfLinks.about) },
  { label: t('explore.footer.getInvolved'), ...site({ name: 'get-involved' }) },
  { label: t('core.footer.contact'), ...mwnf(mwnfLinks.contact) },
  { label: t('core.footer.legalNotice'), ...mwnf(mwnfLinks.legalNotice) },
  { label: t('core.footer.credits'), ...mwnf(mwnfLinks.credits) },
  { label: t('core.footer.cookies'), ...mwnf(mwnfLinks.cookies) },
])
// Legacy's line: its copyright sign, then the text, then the year.
const copyright = computed(() => `© ${t('explore.footer.copyright')}${new Date().getFullYear()}`)
</script>

<template>
  <div class="explore-footer">
    <div class="explore-footer__main">
      <ul class="explore-footer__links">
        <li v-for="link in links" :key="link.label">
          <a
            class="explore-footer__link"
            :href="link.href"
            :target="link.external ? '_blank' : undefined"
            :rel="link.external ? 'noopener' : undefined"
          >{{ link.label }}</a>
        </li>
      </ul>
      <p class="explore-footer__policy">{{ t('explore.footer.languagePolicy') }}</p>
      <p class="explore-footer__copyright">{{ copyright }}</p>
    </div>
    <div class="explore-footer__social">
      <p class="explore-footer__follow">{{ t('explore.footer.followUs') }}</p>
      <SocialLinks :links="mwnfSocialLinks" />
    </div>
  </div>
</template>
