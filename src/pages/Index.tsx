
import Map from '@/components/Map';
import { MapProvider } from '@/components/MapProvider';

const Index = () => {
  return (
    <div className="h-screen w-full">
      <MapProvider>
        <Map />
      </MapProvider>
    </div>
  );
};

export default Index;
