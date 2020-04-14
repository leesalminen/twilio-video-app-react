import { useCallback, useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import queryString from 'query-string';

export function getRoomName() {
  const parsed = queryString.parse(window.location.search);
  const room = parsed.room ? parsed.room : window.sessionStorage.getItem('room');
  return room ? String(room) : null;
}

export function getUserName() {
  const parsed = queryString.parse(window.location.search);
  const user = parsed.user ? parsed.user : window.sessionStorage.getItem('user');
  return user ? String(user) : null;
}

export function getPasscode() {
  const parsed = queryString.parse(window.location.search);
  const passcode = parsed.passcode ? parsed.passcode : window.sessionStorage.getItem('passcode');
  return passcode ? String(passcode) : null;
}

export function fetchToken(name: string, room: string, passcode: string | string[]) {
  return fetch(`/token`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({ user_identity: name, room_name: room, passcode }),
  });
}

export function verifyPasscode(passcode: string | string[]) {
  return fetchToken('temp-name', 'temp-room', passcode).then(async res => {
    const jsonResponse = await res.json();
    if (res.status === 401) {
      return { isValid: false, error: jsonResponse.error?.message };
    }

    if (res.ok && jsonResponse.token) {
      return { isValid: true };
    }
  });
}

export function getErrorMessage(message: string) {
  switch (message) {
    case 'passcode incorrect':
      return 'Passcode is incorrect';
    case 'passcode expired':
      return 'Passcode has expired';
    default:
      return message;
  }
}

export default function usePasscodeAuth() {
  const history = useHistory();

  const [user, setUser] = useState<{ displayName: undefined; photoURL: undefined; passcode: string } | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  const getToken = useCallback(
    (name: string, room: string) => {
      return fetchToken(name, room, user!.passcode)
        .then(res => res.json())
        .then(res => res.token as string);
    },
    [user]
  );

  useEffect(() => {
    const passcode = getPasscode();
    const user = getUserName();
    const room = getRoomName();

    if (user) {
      window.sessionStorage.setItem('user', user);
    }

    if (room) {
      window.sessionStorage.setItem('room', room);
    }

    if (passcode) {
      verifyPasscode(passcode)
        .then(verification => {
          if (verification?.isValid) {
            setUser({ passcode } as any);
            window.sessionStorage.setItem('passcode', passcode);

            history.replace(window.location.pathname);
          }
        })
        .then(() => setIsAuthReady(true));
    } else {
      setIsAuthReady(true);
    }
  }, [history]);

  const signIn = useCallback((passcode: string) => {
    return verifyPasscode(passcode).then(verification => {
      if (verification?.isValid) {
        setUser({ passcode } as any);
        window.sessionStorage.setItem('passcode', passcode);

        const room = getRoomName();
        const user = getUserName();

        if (user) {
          window.sessionStorage.setItem('user', user);
        }

        if (room) {
          window.sessionStorage.setItem('room', room);
        }
      } else {
        throw new Error(getErrorMessage(verification?.error));
      }
    });
  }, []);

  const signOut = useCallback(() => {
    setUser(null);
    window.sessionStorage.removeItem('passcode');
    return Promise.resolve();
  }, []);

  return { user, isAuthReady, getToken, signIn, signOut };
}
