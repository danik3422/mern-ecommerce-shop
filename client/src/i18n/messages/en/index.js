import account from './account'
import catalog from './catalog'
import checkout from './checkout'
import common from './common'
import tracking from './tracking'

export default { ...common, ...catalog, ...checkout, ...account, ...tracking }
