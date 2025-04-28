// frontend/src/App.tsx

import { usePets } from './hooks/usePets';

function App() {
  const { pets, isLoading, isError } = usePets();

  if (isLoading) return <div>Loading...</div>;
  if (isError) return <div>Error loading pets</div>;

  return (
    <div className="p-8">
      <h1>Petstore</h1>
      <ul>
        {pets.map((pet: any) => (
          <li key={pet.id}>
            {pet.name} ({pet.tag})
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;
