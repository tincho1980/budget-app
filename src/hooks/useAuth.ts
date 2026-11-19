import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { clearToken } from '../api/auth'
import { destroySession } from '../api/sessions'

export function useAuth() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const { mutate: logout, isPending: isLoggingOut } = useMutation({
    mutationFn: destroySession,
    networkMode: 'always',
    onSettled: () => {
      clearToken()
      queryClient.clear()
      navigate('/login', { replace: true })
    },
  })

  return { logout, isLoggingOut }
}
