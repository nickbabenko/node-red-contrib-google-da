const helper = require('node-red-node-test-helper')
const GoogleDA = require('./google-da.js')

const axiosMock = jest.fn()
jest.doMock('axios', () => axiosMock)

describe('GoogleDA', () => {

  afterEach(() => {
    //jest.mockReset()
    helper.unload()
  })

  it('should be loaded', done => {
    var flow = [{ id: 'node1', type: 'google-da-config', name: 'google-da-config' }]
    helper.load(GoogleDA, flow, () => {
      var node1 = helper.getNode('node1')
      expect(node1.name).toBe('google-da-config')
      done()
    })
  })

  it('should load all structures', done => {
    const projectId = '1234'
    const structures = [
      { name: 'structure 1'},
      { name: 'structure 2'},
    ]
    axiosMock.mockImplementation(async args => {
      console.log(args)
      if (args.url === `https://smartdevicemanagement.googleapis.com/v1/enterprises/${projectId}/structures`) {
        return structures
      }
      return { access_token: 'abcd' }
    })
    var flow = [
      { id: 'node1', type: 'google-da-get-structures', projectId },
      { id: 'node2', type: 'helper' },
    ]
    helper.load(GoogleDA, flow, () => {
      var node1 = helper.getNode('node1')
      var node2 = helper.getNode('node2')
      node2.on('input', msg => {
        expect(msg.payload).toEqual(structures)
        done()
      })
      node1.receive({ })
    })
  })

})