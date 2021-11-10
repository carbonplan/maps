class Tile {
  constructor({ key, buffers }) {
    this.key = key
    this.buffers = buffers
    this.cache = {
      data: false,
      buffer: false,
      selector: null,
      chunk: null,
    }

    this.loading = false
    this.data = null
    this._ready = false
    this.resetReady()
  }

  ready() {
    return this._ready
  }

  setReady() {
    this._resolver(true)
  }

  resetReady() {
    this._ready = new Promise((resolve) => {
      this._resolver = resolve
    })
  }
}

export default Tile
