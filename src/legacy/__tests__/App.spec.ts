import { describe, it, expect, vi } from 'vitest'
import { createPinia } from 'pinia'
import { mount } from '@vue/test-utils'

import App from '../App.vue'

vi.mock('@/api/auth', () => ({
  authApi: {
    refresh: vi.fn().mockResolvedValue({ accessToken: 'test-token' }),
    me: vi.fn().mockResolvedValue(null),
  },
}))

describe('App', () => {
  it('mounts renders properly', () => {
    const wrapper = mount(App, {
      global: {
        plugins: [createPinia()],
        stubs: {
          RouterView: true,
        },
      },
    })
    expect(wrapper.exists()).toBe(true)
  })
})
