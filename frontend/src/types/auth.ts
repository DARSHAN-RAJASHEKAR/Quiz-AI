export interface User {
  id: string
  email: string
  full_name: string
  is_active: boolean
  created_at: string
}

export interface TokenResponse {
  access_token: string
  token_type: string
}

export interface RegisterRequest {
  email: string
  password: string
  full_name: string
}

export interface LoginRequest {
  username: string // email (OAuth2PasswordRequestForm uses 'username')
  password: string
}
