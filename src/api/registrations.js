export async function fetchParticipants() {
  const response = await fetch('/api/participants', {
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Ekki tókst að sækja iðkendur');
  }

  return response.json();
}

export async function createParticipant(payload) {
  const response = await fetch('/api/participants', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Ekki tókst að stofna iðkanda');
  }

  return response.json();
}

export async function createRegistration(arg1, arg2) {
  const hasExplicitClubSlug = typeof arg1 === 'string';

  const clubSlug = hasExplicitClubSlug
    ? arg1
    : String(arg1?.clubSlug || '').trim();

  const payload = hasExplicitClubSlug ? arg2 : arg1;

  const url = clubSlug
    ? `/api/clubs/${clubSlug}/registrations`
    : '/api/registrations';

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Ekki tókst að vista skráningu');
  }

  return response.json();
}
