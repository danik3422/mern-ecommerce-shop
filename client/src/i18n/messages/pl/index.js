import account from './account'
import catalog from './catalog'
import checkout from './checkout'
import common from './common'

export default { ...common, ...catalog, ...checkout, ...account }
