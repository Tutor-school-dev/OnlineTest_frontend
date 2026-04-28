import axios from "axios"

interface GoogleAuthResponse {
  token: string
  user_id?: string
  user_name?: string
  picture?: string
}

export const userGoogleAuth = (idToken: string) =>
  axios.post<GoogleAuthResponse>('/user/auth/google', { id_token: idToken })
