import AsyncStorage from '@react-native-async-storage/async-storage';

const PROJECTS_KEY = 'projects';

interface Project {
  id: string;
  name: string;
  description: string;
  photos: string[];
}

export const getAllProjects = async (): Promise<Project[]> => {
  try {
    const jsonValue = await AsyncStorage.getItem(PROJECTS_KEY);
    return jsonValue ? JSON.parse(jsonValue) : [];
  } catch (error) {
    console.error('Error reading projects:', error);
    return [];
  }
};

export const saveProject = async (project: Project): Promise<void> => {
  try {
    const existingProjects = await getAllProjects();
    const updatedProjects = [...existingProjects, project];
    await AsyncStorage.setItem(PROJECTS_KEY, JSON.stringify(updatedProjects));
  } catch (error) {
    console.error('Error saving project:', error);
    throw error;
  }
};
