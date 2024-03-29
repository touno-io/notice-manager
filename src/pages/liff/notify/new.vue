<template>
<b-form v-if="!$store.state.wait">>
  <b-row class="mb-2">
    <b-col sm="12" class="notify py-3">
      <p>
        ให้สร้าง service ก่อนเพื่อเชื่อมต่อ token กับ line notify แล้วค่อยเอา
        service ที่สร้างไป join เข้าห้องที่ต้องให้ใช้งาน notify.
      </p>
      <h3>วิธีเพิ่ม service ใหม่</h3>
      <ol>
        <li class="pt-1 pb-1">
          <b-input-group>
            <b-input-group-text>ตั้งชื่อ</b-input-group-text>
            <b-form-input
              v-model.trim="data.name"
              size="sm"
              maxlength="40"
              :state="check.service"
              @keyup.enter="onSubmitNotify($event)"
            />
          </b-input-group>
        </li>
        <li class="pt-1 pb-1">
          Input <b>Service URL</b>
          <span style="font-size: 0.9rem"><code>{{ $hostApi }}/</code></span>
        </li>
        <li class="pt-1 pb-1">
          Input <b>Callback URL</b>
          <span
            v-clipboard="`${$hostApi}/register/${data.name}`"
            class="copy-icon"
          >
            <code>{{ `${$hostApi}/register/${data.name}` }}</code>
            <fa :icon="['far', 'copy']" />
          </span>
        </li>
        <li class="pt-1 pb-1">
          Click
          <a
            href="https://notify-bot.line.me/my/services/new"
            target="_blank"
          >Add Service</a>
          to create service.
        </li>
        <li class="pt-1 pb-1">
          Click <b>Argee and Contuiue</b> and click <b>Add</b>.
        </li>
        <li class="pt-1 pb-1">
          Goto
          <a
            href="https://notify-bot.line.me/my/services/"
            target="_blank"
          >My Services</a>
          and click your service.
        </li>
        <li class="pt-1 pb-1">
          <span class="badge badge-warning">IMPORTANT</span>
          <b>Check your mailbox becouse client secret will be valid after
            verify in email.</b>
        </li>
        <li class="pt-1 pb-1">
          <b-input-group>
            <b-input-group-text>Client ID</b-input-group-text>
            <b-form-input
              v-model.trim="data.client_id"
              size="sm"
              maxlength="32"
              :state="check.client_id"
              @keyup.enter="onSubmitNotify($event)"
            />
          </b-input-group>
        </li>
        <li class="pt-1 pb-1">
          <b-input-group>
            <b-input-group-text>Client Secret</b-input-group-text>
            <b-form-input
              v-model.trim="data.client_secret"
              size="sm"
              maxlength="64"
              :state="check.client_secret"
              @keyup.enter="onSubmitNotify($event)"
            />
          </b-input-group>
        </li>
      </ol>
      <b-btn
        :variant="btn.submit ? 'outline-secondary' : 'primary'"
        block
        :disabled="btn.submit"
        @click="onSubmitNotify($event)"
      >
        <fa v-if="btn.submit" icon="circle-notch" spin /> Create notify
      </b-btn>
      <b-modal
        id="'trash-'"
        v-model="btn.approve"
        title="New service?"
        no-fade
        ok-title="Sure, Add now."
        cancel-title="No."
        ok-variant="success"
        cancel-variant="default"
        @ok="onSubmitNotify($event)"
      >
        Your want to add new service '{{ data.name }}' ?
      </b-modal>
    </b-col>
  </b-row>
</b-form>
</template>

<script>
export default {
  layout: 'liff',
  transition: 'fade',
  asyncData ({ env }) {
    return { env }
  },
  mounted () {
    if (this.env.devEnv) {
      this.$store.commit('profile', this.$tempProfile)
    }
  },
  data: () => ({
    list: [],
    check: {
      room: null,
      service: null,
      client_id: null,
      client_secret: null
    },
    btn: {
      submit: false,
      approve: false
    },
    data: {
      name: '',
      client_id: '',
      client_secret: ''
    }
  }),
  computed: {
    profile () {
      return this.$store.state.profile
    }
  },
  methods: {
    showToast (msg) {
      this.$bvToast.toast(msg, {
        toaster: 'b-toaster-bottom-right',
        title: 'LINE-Notice',
        autoHideDelay: 3000,
        solid: true,
        variant: 'warning'
      })
    },
    checkName (name) {
      return !/[^0-9a-z.-]+/g.test(name)
    },
    async onSubmitNotify (e) {
      if (!this.data.name || !this.checkName(this.data.name)) {
        this.check.service = false
        this.check.client_id = null
        this.check.client_secret = null
        this.showToast('Name is empty or not a-z,0-9, and - .')
        return e.preventDefault()
      }

      if (!this.data.client_id) {
        this.check.client_id = false
        this.check.service = null
        this.check.client_secret = null
        this.showToast('client_id is empty.')
        return e.preventDefault()
      }

      if (!this.data.client_secret) {
        this.check.client_secret = false
        this.check.client_id = null
        this.check.service = null
        this.showToast('client_secret is empty.')
        return e.preventDefault()
      }

      if (!this.btn.approve) {
        this.btn.approve = true
        return e.preventDefault()
      }

      this.btn.submit = true
      try {
        const { status, message, data } = await this.$api.request(
          'POST /notify',
          Object.assign(
            {
              headers: { 'x-user-liff': this.profile.userId }
            },
            this.data
          )
        )

        if (status !== 200) {
          throw new Error(message)
        }

        this.$store.commit('lineNotify', {
          _id: data._id,
          client: this.data.client_id,
          secret: this.data.client_secret,
          text: this.data.name,
          value: this.data.name,
          type: 'notify',
          room: []
        })

        this.$router.push(`/liff/notify/${this.data.name}`)
      } catch (ex) {
        this.showToast(ex.stack || ex.message)
      } finally {
        this.btn.approve = false
        this.btn.submit = false
      }
    }
  }
}
</script>
<style lang="scss">
div.notify {
  font-size: 1.2rem;
  line-height: 1.2rem;
}

.copy-icon {
  cursor: pointer;
  font-size: 0.95rem;
  color: var(--secondary);
}
</style>
