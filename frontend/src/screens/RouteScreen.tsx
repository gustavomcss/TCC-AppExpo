import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';

import { ErrorState } from '../components/ErrorState';
import { LoadingState } from '../components/LoadingState';
import { useAuth } from '../contexts/AuthContext';
import { getRouteComplaint } from '../services/complaints';
import { getOpenRoute } from '../services/routes';
import type { OpenRoute } from '../services/routes';
import { parseServerError } from '../services/serverErrors';
import RouteDepartureScreen from './RouteDepartureScreen';
import RouteReturnScreen from './RouteReturnScreen';

/** What the screen is showing: the request in progress, its failure or the open route (or none). */
type State =
    | { status: 'loading' }
    | { status: 'error'; message: string }
    | { status: 'ready'; route: OpenRoute | null; complaintKm: number | null };

/**
 * The "Rota" module (RF07, RF09). Reads the pending complaint of the open route too, because it
 * affects the km the return must exceed (RB13, RB05). Opens the return form when the driver has an
 * open route and the departure form when there is none, as in the prototype: a driver with an
 * open route cannot start another one (RB02), and without one there is nothing to finalize. The
 * choice is read from the server each time the module opens; the departure and return screens
 * check again on their own, because the server is what holds the rule.
 */
export default function RouteScreen() {
    const { user } = useAuth();
    const [state, setState] = useState<State>({ status: 'loading' });

    const load = useCallback(async () => {
        try {
            const route = user ? await getOpenRoute(user.id) : null;
            const complaint = route ? await getRouteComplaint(route.id) : null;
            setState({
                status: 'ready',
                route,
                complaintKm: complaint?.status === 'pendente' ? complaint.kmComplaint : null,
            });
        } catch (error) {
            setState({ status: 'error', message: parseServerError(error).form ?? '' });
        }
    }, [user]);

    useFocusEffect(
        useCallback(() => {
            load();
        }, [load]),
    );

    if (state.status === 'loading') {
        return <LoadingState />;
    }

    if (state.status === 'error') {
        return (
            <ErrorState
                title="Não foi possível carregar a rota"
                message={state.message}
                onRetry={() => {
                    setState({ status: 'loading' });
                    load();
                }}
            />
        );
    }

    return state.route ? (
        <RouteReturnScreen route={state.route} complaintKm={state.complaintKm} />
    ) : (
        <RouteDepartureScreen />
    );
}
