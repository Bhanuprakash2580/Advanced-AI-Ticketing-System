export function isAuthenticated(): boolean {
  return !!localStorage.getItem("token");
}

export function loginDummyToken() {
  localStorage.setItem("token", "dummy-auth-token");
}

export function logout() {
  localStorage.removeItem("token");
}
