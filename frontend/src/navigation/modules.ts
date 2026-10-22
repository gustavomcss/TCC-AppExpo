import type { LucideIcon } from 'lucide-react-native';
import {
    Ban,
    Car,
    ClipboardCheck,
    Droplets,
    FileText,
    Fuel,
    Route,
    TriangleAlert,
    Users,
    Wrench,
} from 'lucide-react-native';

import type { SessionUser } from '../contexts/AuthContext';

/** Identifiers of the service modules. Each one is also the name of its screen in the stack. */
export type ModuleKey =
    | 'routes'
    | 'complaint'
    | 'fuel'
    | 'oil'
    | 'repair'
    | 'drivers'
    | 'vehicles'
    | 'complaintReview'
    | 'routeClosure'
    | 'reports';

/** A card of the Services tab. `adminOnly` modules are the supervisor's (RF02, RF20). */
export type ServiceModule = {
    key: ModuleKey;
    icon: LucideIcon;
    title: string;
    description: string;
    adminOnly: boolean;
};

/**
 * Every module of the Services tab, operational ones first. This list only decides what is shown
 * and registered in the app: the access restriction itself lives in the API rules (RNF03).
 */
export const SERVICE_MODULES: readonly ServiceModule[] = [
    {
        key: 'routes',
        icon: Route,
        title: 'Rota',
        description: 'Registrar saída e retorno do veículo.',
        adminOnly: false,
    },
    {
        key: 'complaint',
        icon: TriangleAlert,
        title: 'Denúncia de km',
        description: 'Registrar divergência entre o km do veículo e o km real.',
        adminOnly: false,
    },
    {
        key: 'fuel',
        icon: Fuel,
        title: 'Abastecimento',
        description: 'Registrar um abastecimento.',
        adminOnly: false,
    },
    {
        key: 'oil',
        icon: Droplets,
        title: 'Troca de óleo',
        description: 'Registrar uma troca de óleo.',
        adminOnly: false,
    },
    {
        key: 'repair',
        icon: Wrench,
        title: 'Manutenção',
        description: 'Registrar uma manutenção em oficina.',
        adminOnly: false,
    },
    {
        key: 'drivers',
        icon: Users,
        title: 'Gestão de motoristas',
        description: 'Cadastrar e editar os motoristas.',
        adminOnly: true,
    },
    {
        key: 'vehicles',
        icon: Car,
        title: 'Gestão de veículos',
        description: 'Cadastrar e editar os veículos.',
        adminOnly: true,
    },
    {
        key: 'complaintReview',
        icon: ClipboardCheck,
        title: 'Revisão de denúncias',
        description: 'Aprovar ou reprovar divergências de km.',
        adminOnly: true,
    },
    {
        key: 'routeClosure',
        icon: Ban,
        title: 'Encerramento de rotas',
        description: 'Encerrar rotas que ficaram abertas.',
        adminOnly: true,
    },
    {
        key: 'reports',
        icon: FileText,
        title: 'Relatórios',
        description: 'Gerar o relatório financeiro em PDF.',
        adminOnly: true,
    },
];

/** The modules a user of this role sees: the operational ones, plus the admin ones for a supervisor. */
export function modulesFor(role: SessionUser['role']): ServiceModule[] {
    return SERVICE_MODULES.filter((module) => !module.adminOnly || role === 'supervisor');
}
