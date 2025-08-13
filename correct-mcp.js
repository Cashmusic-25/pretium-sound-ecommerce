#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
const path = require('path')

// 환경변수 로드
const envPath = path.join(__dirname, '.env.local')
require('dotenv').config({ path: envPath })

console.error('🚀 Correct MCP Server Starting...')

// Supabase 클라이언트 생성
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Supabase 환경변수가 설정되지 않았습니다.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)
console.error('✅ Supabase 클라이언트 생성 완료')

// MCP 메시지 처리
async function handleMessage(message) {
  console.error('📨 Received:', message.method)
  
  if (message.method === 'initialize') {
    console.error('🔄 Initializing...')
    return {
      jsonrpc: '2.0',
      id: message.id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {
            listChanged: false
          }
        },
        serverInfo: {
          name: 'correct-mcp',
          version: '1.0.0'
        }
      }
    }
  }

  if (message.method === 'tools/list') {
    console.error('📋 Listing tools...')
    return {
      jsonrpc: '2.0',
      id: message.id,
      result: {
        tools: [
          {
            name: 'supabase_query',
            description: 'Supabase에서 SQL 쿼리를 실행합니다.',
            inputSchema: {
              type: 'object',
              properties: {
                sql: {
                  type: 'string',
                  description: '실행할 SQL 쿼리'
                }
              },
              required: ['sql']
            }
          },
          {
            name: 'supabase_table_info',
            description: '테이블 정보를 조회합니다.',
            inputSchema: {
              type: 'object',
              properties: {
                table_name: {
                  type: 'string',
                  description: '조회할 테이블명'
                }
              },
              required: ['table_name']
            }
          }
        ]
      }
    }
  }

  if (message.method === 'tools/call') {
    const { name, arguments: args } = message.params
    console.error(`🔧 Calling tool: ${name} with args:`, args)
    
    if (name === 'supabase_query') {
      const { sql } = args
      console.error(`🔍 SQL 실행: ${sql}`)
      
      try {
        const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql })
        
        if (error) {
          return {
            jsonrpc: '2.0',
            id: message.id,
            error: {
              code: -32603,
              message: `SQL 실행 오류: ${error.message}`
            }
          }
        }
        
        return {
          jsonrpc: '2.0',
          id: message.id,
          result: {
            content: [
              {
                type: 'text',
                text: `✅ SQL 실행 완료:\n${JSON.stringify(data, null, 2)}`
              }
            ]
          }
        }
      } catch (error) {
        return {
          jsonrpc: '2.0',
          id: message.id,
          error: {
            code: -32603,
            message: `SQL 실행 중 오류: ${error.message}`
          }
        }
      }
    }
    
    if (name === 'supabase_table_info') {
      const { table_name } = args
      console.error(`🔍 테이블 정보 조회: ${table_name}`)
      
      try {
        const { data, error } = await supabase
          .from(table_name)
          .select('*')
          .limit(5)
        
        if (error) {
          return {
            jsonrpc: '2.0',
            id: message.id,
            error: {
              code: -32603,
              message: `테이블 조회 오류: ${error.message}`
            }
          }
        }
        
        return {
          jsonrpc: '2.0',
          id: message.id,
          result: {
            content: [
              {
                type: 'text',
                text: `📋 테이블 ${table_name} 정보 (최대 5개 행):\n${JSON.stringify(data, null, 2)}`
              }
            ]
          }
        }
      } catch (error) {
        return {
          jsonrpc: '2.0',
          id: message.id,
          error: {
            code: -32603,
            message: `테이블 조회 중 오류: ${error.message}`
          }
        }
      }
    }
  }

  console.error('❌ Unknown method:', message.method)
  return {
    jsonrpc: '2.0',
    id: message.id,
    error: {
      code: -32601,
      message: `Method not found: ${message.method}`
    }
  }
}

// 표준 입력 처리
let buffer = ''

process.stdin.on('data', async (chunk) => {
  console.error('📥 Received chunk length:', chunk.length)
  buffer += chunk
  
  while (true) {
    const newlineIndex = buffer.indexOf('\n')
    if (newlineIndex === -1) break
    
    const line = buffer.slice(0, newlineIndex).trim()
    buffer = buffer.slice(newlineIndex + 1)
    
    if (line) {
      console.error('📝 Processing line:', line)
      try {
        const message = JSON.parse(line)
        const response = await handleMessage(message)
        
        if (response) {
          const responseStr = JSON.stringify(response) + '\n'
          console.error('📤 Sending response:', responseStr)
          process.stdout.write(responseStr)
        }
      } catch (error) {
        console.error('❌ Error processing line:', error)
      }
    }
  }
})

process.stdin.on('end', () => {
  console.error('🔚 stdin ended')
  process.exit(0)
})

process.on('error', (error) => {
  console.error('❌ Process error:', error)
})

console.error('✅ Correct MCP Server Ready') 