'use client';

import { useState, useEffect, useCallback } from 'react';
import { Employee, CreateEmployeePayload } from '@/types';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';

export function useEmployees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEmployees = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const empCollection = collection(db, 'employees');
      const querySnapshot = await getDocs(empCollection);
      const list: Employee[] = [];
      querySnapshot.forEach((doc) => {
        list.push(doc.data() as Employee);
      });
      // Sort by joiningDate descending (newest first)
      list.sort((a, b) => new Date(b.joiningDate).getTime() - new Date(a.joiningDate).getTime());
      setEmployees(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch employees');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const addEmployee = useCallback(async (payload: CreateEmployeePayload): Promise<Employee> => {
    setError(null);
    try {
      const empCollection = collection(db, 'employees');
      const docRef = doc(empCollection);
      const newEmployee: Employee = {
        id: docRef.id,
        ...payload,
      };
      await setDoc(docRef, newEmployee);
      setEmployees((prev) => [newEmployee, ...prev]);
      return newEmployee;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to add employee';
      setError(msg);
      throw new Error(msg);
    }
  }, []);

  const updateEmployee = useCallback(async (id: string, payload: Partial<CreateEmployeePayload>): Promise<Employee> => {
    setError(null);
    try {
      const docRef = doc(db, 'employees', id);
      await updateDoc(docRef, payload);
      let updated: Employee | undefined;
      setEmployees((prev) =>
        prev.map((emp) => {
          if (emp.id === id) {
            updated = { ...emp, ...payload };
            return updated;
          }
          return emp;
        })
      );
      if (!updated) throw new Error('Employee not found');
      return updated;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update employee';
      setError(msg);
      throw new Error(msg);
    }
  }, []);

  const deleteEmployee = useCallback(async (id: string): Promise<void> => {
    setError(null);
    try {
      const docRef = doc(db, 'employees', id);
      await deleteDoc(docRef);
      setEmployees((prev) => prev.filter((emp) => emp.id !== id));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete employee';
      setError(msg);
      throw new Error(msg);
    }
  }, []);

  return {
    employees,
    isLoading,
    error,
    refetch: fetchEmployees,
    addEmployee,
    updateEmployee,
    deleteEmployee,
  };
}
