'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const glassCard: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.10)',
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  borderRadius: 20,
  padding: 36,
  width: '100%',
};

const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.12)',
  color: '#fff',
  borderRadius: 10,
  padding: '10px 14px',
};

const primaryButtonStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg, #C77DFF, #FF6FA3)',
  color: '#fff',
  border: 'none',
  boxShadow: '0 0 24px rgba(199,125,255,0.25)',
  flex: 1,
};

const outlineButtonStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  color: 'rgba(255,255,255,0.7)',
  border: '1px solid rgba(255,255,255,0.15)',
  flex: 1,
};

const featureItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 14,
  padding: '12px 14px',
  borderRadius: 12,
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
};

const featureBadgeStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: 32,
  width: 32,
  flexShrink: 0,
  borderRadius: '50%',
  background: 'linear-gradient(135deg, #C77DFF, #FF6FA3)',
  color: '#fff',
  fontSize: 13,
  fontWeight: 700,
};

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [workspaceName, setWorkspaceName] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSaveWorkspace = async () => {
    if (!workspaceName.trim()) return;
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('workspace_id')
        .eq('id', user.id)
        .single();

      if (profile?.workspace_id) {
        await supabase
          .from('workspaces')
          .update({ nombre: workspaceName.trim() })
          .eq('id', profile.workspace_id);
      }

      setStep(3);
    } catch (error) {
      console.error('Error updating workspace:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto">
      {/* Progress indicator */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 32 }}>
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            style={{
              height: 6,
              width: 40,
              borderRadius: 999,
              transition: 'all 0.3s',
              background:
                s === step
                  ? '#C77DFF'
                  : s < step
                    ? 'rgba(199,125,255,0.4)'
                    : 'rgba(255,255,255,0.15)',
            }}
          />
        ))}
      </div>

      {/* Step 1: Welcome */}
      {step === 1 && (
        <div style={glassCard}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{ fontSize: 40, marginBottom: 14 }}>🚀</div>
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: 24,
                color: '#fff',
                marginBottom: 8,
              }}
            >
              Bienvenido a AI Agency OS
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14 }}>
              Tu plataforma autónoma para escalar tu agencia de IA
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
            <div style={featureItemStyle}>
              <div style={featureBadgeStyle}>1</div>
              <div>
                <p style={{ color: '#fff', fontWeight: 500, fontSize: 14, marginBottom: 2 }}>Audita un negocio</p>
                <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13 }}>
                  Analiza cualquier web y descubre oportunidades de IA
                </p>
              </div>
            </div>
            <div style={featureItemStyle}>
              <div style={featureBadgeStyle}>2</div>
              <div>
                <p style={{ color: '#fff', fontWeight: 500, fontSize: 14, marginBottom: 2 }}>Genera tu propuesta</p>
                <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13 }}>
                  Crea propuestas profesionales con un clic
                </p>
              </div>
            </div>
            <div style={featureItemStyle}>
              <div style={featureBadgeStyle}>3</div>
              <div>
                <p style={{ color: '#fff', fontWeight: 500, fontSize: 14, marginBottom: 2 }}>Cierra el cliente</p>
                <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13 }}>
                  Envía la propuesta y gestiona todo el pipeline
                </p>
              </div>
            </div>
          </div>

          <Button
            style={{ ...primaryButtonStyle, flex: 'unset', width: '100%' }}
            size="lg"
            onClick={() => setStep(2)}
          >
            Empezar
          </Button>
        </div>
      )}

      {/* Step 2: Workspace name */}
      {step === 2 && (
        <div style={glassCard}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{ fontSize: 40, marginBottom: 14 }}>🏢</div>
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: 24,
                color: '#fff',
                marginBottom: 8,
              }}
            >
              ¿Cómo se llama tu agencia?
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14 }}>
              Puedes cambiarlo después en los ajustes
            </p>
          </div>

          <div style={{ marginBottom: 28 }}>
            <Input
              placeholder="Ej: NexusAI Agency"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              style={{ ...inputStyle, fontSize: 15 }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveWorkspace();
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <Button
              style={outlineButtonStyle}
              onClick={() => setStep(1)}
            >
              Atrás
            </Button>
            <Button
              style={primaryButtonStyle}
              size="lg"
              onClick={handleSaveWorkspace}
              disabled={!workspaceName.trim() || loading}
            >
              {loading ? 'Guardando...' : 'Continuar'}
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: All set */}
      {step === 3 && (
        <div style={glassCard}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{ fontSize: 40, marginBottom: 14 }}>🎉</div>
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: 24,
                color: '#fff',
                marginBottom: 8,
              }}
            >
              ¡Todo listo!
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14 }}>
              Tu workspace{' '}
              <span style={{ color: '#fff', fontWeight: 600 }}>{workspaceName}</span>{' '}
              está configurado
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                borderRadius: 12,
                background: 'rgba(199,125,255,0.12)',
                border: '1px solid rgba(199,125,255,0.25)',
                padding: '12px 20px',
              }}
            >
              <span
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #C77DFF, #FF6FA3)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                3
              </span>
              <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>créditos gratis para empezar</span>
            </div>
          </div>

          <Button
            style={{ ...primaryButtonStyle, flex: 'unset', width: '100%' }}
            size="lg"
            onClick={() => router.push('/analizador')}
          >
            Hacer mi primera auditoría
          </Button>
        </div>
      )}
    </div>
  );
}
