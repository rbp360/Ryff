import { PRESTIGE_CARS } from '@/lib/prestige/car-data';
import { CarPassportClient } from './CarPassportClient';
import { notFound } from 'next/navigation';

export async function generateStaticParams() {
  return PRESTIGE_CARS.map((car) => ({
    id: car.id,
  }));
}

export default async function CarPassportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const car = PRESTIGE_CARS.find((c) => c.id === resolvedParams.id);

  if (!car) {
    notFound();
  }

  return <CarPassportClient car={car} />;
}

