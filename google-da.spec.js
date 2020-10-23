const helper = require('node-red-node-test-helper')
const GoogleDA = require('./google-da.js')

describe('GoogleDA', () => {

  it('should be loaded', done => {
    var flow = [{ id: 'n1', type: 'google-da-config', name: 'google-da-config' }]
    helper.load(GoogleDA, flow, () => {
      var n1 = helper.getNode('n1')
      expect(n1.name).toBe('google-da-config')
      done()
    })
  })

})