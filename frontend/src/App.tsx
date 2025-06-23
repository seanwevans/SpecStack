// frontend/src/App.tsx

// Generated React Query hooks live under ../../generated after running the generator
import { useGetPetById } from '../../generated/frontend/src/hooks';

function App() {
  // Example usage fetching the pet with id=1
  const { data: pet, isLoading, isError } = useGetPetById({ id: 1 });

  if (isLoading) return <div>Loading...</div>;
  if (isError) return <div>Error loading pet</div>;

  return (
    <div className="p-8">
      <h1>Petstore</h1>
      {pet ? (
        <div>
          {pet.name} ({pet.tag})
        </div>
      ) : (
        <div>No pet found</div>
      )}
    </div>
  );
}

export default App;
