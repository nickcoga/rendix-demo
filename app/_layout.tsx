import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { COLORS } from '../src/constants/theme';
import { initDatabase, DATABASE_NAME } from '../src/db/schema';
import { cleanOrphanPhotos } from '../src/services/storage/photoStorage';

function AppInitializer({ children }: { children: React.ReactNode }) {
  const db = useSQLiteContext();

  useEffect(() => {
    // Run background orphan cleanup with grace period (non-blocking)
    cleanOrphanPhotos(db);
  }, [db]);

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <SQLiteProvider databaseName={DATABASE_NAME} onInit={initDatabase}>
        <AppInitializer>
          <Stack
            screenOptions={{
              headerStyle: {
                backgroundColor: COLORS.primary,
              },
              headerTintColor: COLORS.textWhite,
              headerTitleStyle: {
                fontWeight: '800',
                fontSize: 18,
              },
              headerBackTitle: 'Atrás',
              contentStyle: {
                backgroundColor: COLORS.background,
              },
            }}
          >
            <Stack.Screen
              name="index"
              options={{
                title: 'Rendix',
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="trip/new"
              options={{
                title: 'Nueva Rendición',
                presentation: 'card',
              }}
            />
            <Stack.Screen
              name="trip/[id]/index"
              options={{
                title: 'Detalle de Rendición',
              }}
            />
            <Stack.Screen
              name="expense/capture"
              options={{
                title: 'Capturar Comprobante',
              }}
            />
            <Stack.Screen
              name="expense/form"
              options={{
                title: 'Revisar Comprobante',
              }}
            />
            <Stack.Screen
              name="expense/[id]"
              options={{
                title: 'Detalle del Comprobante',
              }}
            />
            <Stack.Screen
              name="settings/index"
              options={{
                title: 'Configuración',
              }}
            />
          </Stack>
        </AppInitializer>
      </SQLiteProvider>
    </SafeAreaProvider>
  );
}
