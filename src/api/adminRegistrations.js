export async function fetchAdminRegistrations() {
  const response = await fetch('/api/admin/registrations', {
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Ekki tókst að sækja skráningar');
  }

  return response.json();
}

export async function updateAdminRegistration(id, payload) {
  const response = await fetch(`/api/admin/registrations/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Ekki tókst að uppfæra skráningu');
  }

  return response.json();
}
