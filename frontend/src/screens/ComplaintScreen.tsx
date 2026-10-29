import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { TriangleAlert } from 'lucide-react-native';
import { useCallback, useState } from 'react';

import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { LoadingState } from '../components/LoadingState';
import { useAuth } from '../contexts/AuthContext';
import type { RootNavigation } from '../navigation/types';
import { getRouteComplaint } from '../services/complaints';
import type { Complaint } from '../services/complaints';
import { getOpenRoute } from '../services/routes';
import type { OpenRoute } from '../services/routes';
import { parseServerError } from '../services/serverErrors';
import ComplaintFormScreen from './ComplaintFormScreen';
import ComplaintSentScreen from './ComplaintSentScreen';

/** What the screen is showing: the request in progress, its failure, or the open route (if any) and its complaint (if any). */
type State =
    | { status: 'loading' }
    | { status: 'error'; message: string }
    | { status: 'ready'; route: OpenRoute | null; complaint: Complaint | null };

/**
 * The "Denúncia de km" module (RF14). A complaint is only for an open route, so without one the
 * screen says so and offers the way to the "Rota" module. With an open route it opens the form,
 * or, when the route already has its complaint (RB11), the state of that complaint. The choice is
 * read from the server each time the module opens and again when the form reports it is out of
 * date; the form still lets the server decide, because the server is what holds the rule.
 */
export default function ComplaintScreen() {
    const { user } = useAuth();
    const navigation = useNavigation<RootNavigation>();
    const [state, setState] = useState<State>({ status: 'loading' });

    const load = useCallback(async () => {
        try {
            const route = user ? await getOpenRoute(user.id) : null;
            const complaint = route ? await getRouteComplaint(route.id) : null;
            setState({ status: 'ready', route, complaint });
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
                title="Não foi possível carregar a denúncia"
                message={state.message}
                onRetry={() => {
                    setState({ status: 'loading' });
                    load();
                }}
            />
        );
    }

    if (!state.route) {
        return (
            <EmptyState
                icon={TriangleAlert}
                title="Nenhuma rota aberta"
                description="A denúncia de km só pode ser enviada com uma rota aberta."
                actionTitle="Ir para Rota"
                onAction={() => navigation.replace('routes')}
            />
        );
    }

    return state.complaint ? (
        <ComplaintSentScreen route={state.route} complaint={state.complaint} />
    ) : (
        <ComplaintFormScreen route={state.route} onChanged={load} />
    );
}
