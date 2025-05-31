'use client'

import { createContext, useContext, useReducer, useEffect } from 'react'

const CartContext = createContext()

// 장바구니 액션 타입들
const CART_ACTIONS = {
  ADD_ITEM: 'ADD_ITEM',
  REMOVE_ITEM: 'REMOVE_ITEM',
  UPDATE_QUANTITY: 'UPDATE_QUANTITY',
  CLEAR_CART: 'CLEAR_CART',
  LOAD_CART: 'LOAD_CART'
}

// 장바구니 리듀서
function cartReducer(state, action) {
  switch (action.type) {
    case CART_ACTIONS.ADD_ITEM: {
      const existingItem = state.items.find(item => item.id === action.payload.id)
      
      if (existingItem) {
        return {
          ...state,
          items: state.items.map(item =>
            item.id === action.payload.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          )
        }
      }
      
      return {
        ...state,
        items: [...state.items, { ...action.payload, quantity: 1 }]
      }
    }
    
    case CART_ACTIONS.REMOVE_ITEM:
      return {
        ...state,
        items: state.items.filter(item => item.id !== action.payload)
      }
    
    case CART_ACTIONS.UPDATE_QUANTITY:
      return {
        ...state,
        items: state.items.map(item =>
          item.id === action.payload.id
            ? { ...item, quantity: Math.max(0, action.payload.quantity) }
            : item
        ).filter(item => item.quantity > 0)
      }
    
    case CART_ACTIONS.CLEAR_CART:
      return {
        ...state,
        items: []
      }
    
    case CART_ACTIONS.LOAD_CART:
      return {
        ...state,
        items: action.payload
      }
    
    default:
      return state
  }
}

// 초기 상태
const initialState = {
  items: []
}

// localStorage 안전 함수들
const safeGetFromStorage = (key) => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : null
    }
  } catch (error) {
    console.warn('localStorage 읽기 실패:', error)
  }
  return null
}

const safeSetToStorage = (key, value) => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(key, JSON.stringify(value))
    }
  } catch (error) {
    console.warn('localStorage 저장 실패:', error)
  }
}

// CartProvider 컴포넌트
export function CartProvider({ children }) {
  const [state, dispatch] = useReducer(cartReducer, initialState)

  // 컴포넌트 마운트 시 로컬 스토리지에서 장바구니 불러오기
  useEffect(() => {
    const savedCart = safeGetFromStorage('cart')
    if (savedCart && Array.isArray(savedCart)) {
      dispatch({ type: CART_ACTIONS.LOAD_CART, payload: savedCart })
    }
  }, [])

  // 장바구니 변경시 로컬 스토리지에 저장 (가능한 경우에만)
  useEffect(() => {
    // 초기 로드가 아닌 실제 변경사항만 저장
    if (state.items.length > 0 || typeof window !== 'undefined') {
      safeSetToStorage('cart', state.items)
    }
  }, [state.items])

  // 장바구니 함수들
  const addToCart = (product) => {
    dispatch({ type: CART_ACTIONS.ADD_ITEM, payload: product })
  }

  const removeFromCart = (productId) => {
    dispatch({ type: CART_ACTIONS.REMOVE_ITEM, payload: productId })
  }

  const updateQuantity = (productId, quantity) => {
    dispatch({ type: CART_ACTIONS.UPDATE_QUANTITY, payload: { id: productId, quantity } })
  }

  const clearCart = () => {
    dispatch({ type: CART_ACTIONS.CLEAR_CART })
  }

  // 총 개수 계산
  const getTotalItems = () => {
    return state.items.reduce((total, item) => total + item.quantity, 0)
  }

  // 총 가격 계산 (원화 문자열 제거 후 계산)
  const getTotalPrice = () => {
    return state.items.reduce((total, item) => {
      // 가격이 문자열인 경우와 숫자인 경우 모두 처리
      let price = typeof item.price === 'string' 
        ? parseInt(item.price.replace(/[₩,]/g, '')) || 0
        : item.price || 0
      return total + (price * item.quantity)
    }, 0)
  }

  // 특정 상품이 장바구니에 있는지 확인
  const isInCart = (productId) => {
    return state.items.some(item => item.id === productId)
  }

  // 특정 상품의 수량 가져오기
  const getItemQuantity = (productId) => {
    const item = state.items.find(item => item.id === productId)
    return item ? item.quantity : 0
  }

  // 컨텍스트 값
  const value = {
    items: state.items,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getTotalItems,
    getTotalPrice,
    isInCart,
    getItemQuantity
  }

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  )
}

// 커스텀 훅
export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart는 CartProvider 내부에서 사용되어야 합니다')
  }
  return context
}