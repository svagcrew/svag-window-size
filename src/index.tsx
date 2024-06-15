import { useEffect, useState } from 'react'
import { useIsAfterSsr } from 'svag-ssr'
import { createStorik as createStorikOriginal } from 'svag-storik/dist/client.js'

type WindowSizeData<TWindowSizeName extends string> = {
  width: number
  height: number
  size: TWindowSizeName
  ready: boolean
  watcherInitialized: boolean
}
type DefaultSizeName = 'mobile' | 'tablet' | 'desktop'

export const createWindowSizeThings = <TWindowSizeName extends string = DefaultSizeName>({
  sizes = {
    mobile: 420,
    tablet: 1_024,
    desktop: Infinity,
  } as Record<TWindowSizeName, number>,
  defaultWidth = 0,
  defaultHeight = 0,
  ssr = false,
  createStorik,
}: {
  sizes?: Record<TWindowSizeName, number>
  defaultWidth?: number
  defaultHeight?: number
  ssr?: boolean
  createStorik?: typeof createStorikOriginal
} = {}) => {
  createStorik = createStorik || createStorikOriginal
  const initialWindowWidth = ssr ? defaultWidth : typeof window === 'undefined' ? defaultWidth : window.innerWidth
  const initialWindowHeight = ssr ? defaultHeight : typeof window === 'undefined' ? defaultHeight : window.innerHeight

  const getSizeNameByWindowWidth = (width: number) => {
    const entries = Object.entries(sizes) as Array<[TWindowSizeName, number]>
    for (const [name, size] of entries) {
      if (width <= size) {
        return name as TWindowSizeName
      }
    }
    return entries[entries.length - 1][0] as TWindowSizeName
  }

  const storik = createStorik<WindowSizeData<TWindowSizeName>>({
    defaultValue: {
      width: initialWindowWidth,
      height: initialWindowHeight,
      ready: !ssr,
      size: getSizeNameByWindowWidth(initialWindowWidth),
      watcherInitialized: false,
    },
  })

  const WindowSizeWatcher = () => {
    const store = storik.useStore()
    const isAfterSsr = useIsAfterSsr()
    const [watcherAlreadyInitialized] = useState(store.watcherInitialized)

    useEffect(() => {
      if (watcherAlreadyInitialized) {
        console.error('svag-window-size: WindowSizeWatcher already initialized')
      } else {
        storik.updateStore({
          watcherInitialized: true,
        })
      }
    }, [])

    useEffect(() => {
      if (!isAfterSsr) {
        return
      }
      if (watcherAlreadyInitialized) {
        return
      }
      const handleResize = () => {
        storik.updateStore({
          width: window.innerWidth,
          height: window.innerHeight,
          size: getSizeNameByWindowWidth(window.innerWidth),
          ready: true,
        })
      }
      window.addEventListener('resize', handleResize)
      handleResize()
      // eslint-disable-next-line consistent-return
      return () => {
        window.removeEventListener('resize', handleResize)
      }
    }, [isAfterSsr, watcherAlreadyInitialized])

    return null
  }

  const useWindowSize = () => {
    const store = storik.useStore()
    return {
      width: store.width,
      height: store.height,
      size: store.size,
      ready: store.ready,
    }
  }

  const useValueByWindowSize = <TValue,>(config: Array<[TWindowSizeName | number, TValue]>): TValue => {
    const store = storik.useStore()
    const entries = config as Array<[TWindowSizeName | number, TValue]>
    for (const [sizeOrNumber, value] of entries) {
      if (typeof sizeOrNumber === 'number') {
        if (store.width <= sizeOrNumber) {
          return value
        }
      } else {
        const sizeWidth = sizes[sizeOrNumber]
        if (store.width <= sizeWidth) {
          return value
        }
      }
    }
    return entries[entries.length - 1][1]
  }

  return {
    WindowSizeWatcher,
    useWindowSize,
    useValueByWindowSize,
    windowSizes: sizes,
  }
}
