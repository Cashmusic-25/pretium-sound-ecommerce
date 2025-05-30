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

// CartProvider 컴포넌트
export function CartProvider({ children }) {
  const [state, dispatch] = useReducer(cartReducer, initialState)

  // 로컬 스토리지에서 장바구니 불러오기 (브라우저에서만)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedCart = localStorage.getItem('cart')
      if (savedCart) {
        try {
          const parsedCart = JSON.parse(savedCart)
          dispatch({ type: CART_ACTIONS.LOAD_CART, payload: parsedCart })
        } catch (error) {
          console.error('장바구니 데이터 로드 실패:', error)
        }
      }
    }
  }, [])

  // 장바구니 변경시 로컬 스토리지에 저장
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('cart', JSON.stringify(state.items))
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
      const price = parseInt(item.price.replace(/[₩,]/g, ''))
      return total + (price * item.quantity)
    }, 0)
  }

  // 컨텍스트 값
  const value = {
    items: state.items,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getTotalItems,
    getTotalPrice
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