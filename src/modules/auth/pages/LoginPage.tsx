import { LoginForm } from '../components/LoginForm';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  PageCenter,
  PageTitle,
} from '@/components/ui';

export default function LoginPage() {
  return (
    <PageCenter>
      <Card>
        <CardHeader>
          <PageTitle>SYNC-SUNAT</PageTitle>
          <CardDescription>
            Ingreso al Sistema de Gestión Tributaria y Financiera para MYPES
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </PageCenter>
  );
}
