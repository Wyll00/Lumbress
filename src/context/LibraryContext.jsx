import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { sileo } from 'sileo';
import { AuthContext } from './AuthContext';
import { API_URL as BASE_URL, withAuth } from '../config';

export const LibraryContext = createContext();

const API_URL = `${BASE_URL}/api/books`;
const CATEGORIES_URL = `${BASE_URL}/api/categories`;
const SHELVES_URL = `${BASE_URL}/api/shelves`;

export const LibraryProvider = ({ children }) => {
  const { isAuthenticated } = useContext(AuthContext);
  const [books, setBooks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [shelves, setShelves] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      if (!isAuthenticated) {
        setBooks([]);
        setCategories([]);
        setShelves([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const resBooks = await fetch(API_URL, withAuth());
        if (resBooks.ok) {
          const data = await resBooks.json();
          setBooks(data);
        }

        const resCat = await fetch(CATEGORIES_URL, withAuth());
        if (resCat.ok) {
          const catData = await resCat.json();
          setCategories(catData);
        }

        const resShelves = await fetch(SHELVES_URL, withAuth());
        if (resShelves.ok) {
          setShelves(await resShelves.json());
        }
      } catch (err) {
        console.error("Error connecting to server:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [isAuthenticated]);

  const jsonHeaders = { 'Content-Type': 'application/json' };

  const refetchBooks = useCallback(async () => {
    try {
      const res = await fetch(API_URL, withAuth());
      if (res.ok) setBooks(await res.json());
    } catch (err) {
      console.error('Error refetching books:', err);
    }
  }, []);

  const addBook = async (bookData) => {
    try {
      const res = await fetch(API_URL, withAuth({
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify(bookData)
      }));
      if (res.ok) {
        const savedBook = await res.json();
        setBooks(prev => [savedBook, ...prev]);
      } else {
        // P. ej. límite del plan gratis (402): avisar al usuario en vez de fallar en silencio
        const data = await res.json().catch(() => ({}));
        if (res.status === 402) sileo.warning({ title: 'Has alcanzado el límite del plan gratis', description: data.message || 'Pásate a Premium para biblioteca ilimitada.' });
        else if (data.message) sileo.error({ title: 'No se pudo añadir el libro', description: data.message });
      }
    } catch (err) {
      console.error("Error adding book:", err);
    }
  };

  const updateBook = async (id, updatedFields) => {
    setBooks(prev => prev.map(book =>
      book.id === id ? { ...book, ...updatedFields } : book
    ));

    try {
      await fetch(`${API_URL}/${id}`, withAuth({
        method: 'PUT',
        headers: jsonHeaders,
        body: JSON.stringify(updatedFields)
      }));
    } catch (err) {
      console.error("Error updating book:", err);
    }
  };

  const deleteBook = async (id) => {
    setBooks(prev => prev.filter(book => book.id !== id));
    try {
      await fetch(`${API_URL}/${id}`, {
        ...withAuth(),
        method: 'DELETE'
      });
    } catch (err) {
      console.error("Error deleting book:", err);
    }
  };

  const createCategory = async (nombre) => {
    try {
      const res = await fetch(CATEGORIES_URL, withAuth({
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify({ nombre })
      }));
      if (res.ok) {
        const newCat = await res.json();
        setCategories(prev => [...prev, { id: newCat.id, nombre: newCat.nombre, usuario_id: newCat.usuario_id }]);
        return newCat;
      }
    } catch (err) {
      console.error("Error creating category:", err);
    }
    return null;
  };

  const deleteCategory = async (id) => {
    try {
      const res = await fetch(`${CATEGORIES_URL}/${id}`, {
        ...withAuth(),
        method: 'DELETE'
      });
      if (res.ok) {
        setCategories(prev => prev.filter(cat => cat.id !== id));
        // Remove this category from all local books
        const catObj = categories.find(c => c.id === id);
        if (catObj) {
          setBooks(prev => prev.map(book => {
             const currentCats = book.categories || [];
             if (currentCats.includes(catObj.nombre)) {
                return { ...book, categories: currentCats.filter(c => c !== catObj.nombre) };
             }
             return book;
          }));
        }
      }
    } catch (err) {
      console.error("Error deleting category:", err);
    }
  };

  const assignCategory = async (libro_id, etiqueta_id) => {
    try {
      const res = await fetch(`${CATEGORIES_URL}/assign`, withAuth({
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify({ libro_id, etiqueta_id })
      }));
      if (res.ok) {
        setBooks(prev => prev.map(book => {
          if (book.id === libro_id) {
            const categoryObj = categories.find(c => c.id === Number(etiqueta_id) || c.id === String(etiqueta_id));
            if (categoryObj) {
               const currentCats = book.categories || [];
               if (!currentCats.includes(categoryObj.nombre)) {
                 return { ...book, categories: [...currentCats, categoryObj.nombre] };
               }
            }
          }
          return book;
        }));
      }
    } catch (err) {
      console.error("Error assigning category:", err);
    }
  };

  const removeCategory = async (libro_id, etiqueta_id) => {
    try {
      const res = await fetch(`${CATEGORIES_URL}/remove`, withAuth({
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify({ libro_id, etiqueta_id })
      }));
      if (res.ok) {
        setBooks(prev => prev.map(book => {
          if (book.id === libro_id) {
            const categoryObj = categories.find(c => c.id === Number(etiqueta_id) || c.id === String(etiqueta_id));
            if (categoryObj) {
               const currentCats = book.categories || [];
               return { ...book, categories: currentCats.filter(c => c !== categoryObj.nombre) };
            }
          }
          return book;
        }));
      }
    } catch (err) {
      console.error("Error removing category:", err);
    }
  };

  // ===== Estanterías =====
  const createShelf = async (nombre, emoji = '📚') => {
    try {
      const res = await fetch(SHELVES_URL, withAuth({
        method: 'POST', headers: jsonHeaders,
        body: JSON.stringify({ nombre, emoji })
      }));
      const data = await res.json();
      if (res.ok) { setShelves(prev => [...prev, data].sort((a, b) => a.nombre.localeCompare(b.nombre))); return data; }
      sileo.error({ title: 'No se pudo crear la estantería', description: data.message || 'Inténtalo de nuevo.' });
    } catch (err) { console.error('Error creando estantería:', err); }
    return null;
  };

  const renameShelf = async (id, fields) => {
    setShelves(prev => prev.map(s => s.id === id ? { ...s, ...fields } : s));
    try {
      await fetch(`${SHELVES_URL}/${id}`, withAuth({
        method: 'PUT', headers: jsonHeaders, body: JSON.stringify(fields)
      }));
    } catch (err) { console.error('Error renombrando estantería:', err); }
  };

  const deleteShelf = async (id) => {
    setShelves(prev => prev.filter(s => s.id !== id));
    setBooks(prev => prev.map(b => ({ ...b, shelfIds: (b.shelfIds || []).filter(sid => sid !== id) })));
    try {
      await fetch(`${SHELVES_URL}/${id}`, { ...withAuth(), method: 'DELETE' });
    } catch (err) { console.error('Error eliminando estantería:', err); }
  };

  // Añade o quita un libro de una estantería (actualiza shelfIds del libro y el contador)
  const toggleBookInShelf = async (shelfId, bookId, add) => {
    setBooks(prev => prev.map(b => {
      if (b.id !== bookId) return b;
      const ids = new Set(b.shelfIds || []);
      add ? ids.add(shelfId) : ids.delete(shelfId);
      return { ...b, shelfIds: [...ids] };
    }));
    setShelves(prev => prev.map(s => s.id === shelfId ? { ...s, libros: Math.max(0, (s.libros || 0) + (add ? 1 : -1)) } : s));
    try {
      if (add) {
        await fetch(`${SHELVES_URL}/${shelfId}/books`, withAuth({
          method: 'POST', headers: jsonHeaders, body: JSON.stringify({ libro_id: Number(bookId) })
        }));
      } else {
        await fetch(`${SHELVES_URL}/${shelfId}/books/${bookId}`, { ...withAuth(), method: 'DELETE' });
      }
    } catch (err) { console.error('Error actualizando estantería del libro:', err); }
  };

  const updateProgress = (id, pagesRead) => {
    const bookToUpdate = books.find(b => b.id === id);
    if (!bookToUpdate) return;

    let newStatus = bookToUpdate.status;
    let newPages = pagesRead;

    if (bookToUpdate.totalPages > 0 && pagesRead >= bookToUpdate.totalPages) {
      newStatus = 'Read';
      newPages = bookToUpdate.totalPages;
    } else if (pagesRead > 0 && (bookToUpdate.status === 'To Read' || bookToUpdate.status === 'Pendiente')) {
      newStatus = 'Reading';
    }

    const updates = { pagesRead: newPages, status: newStatus };
    // Al pasar a "leído" sin fecha de fin, la ponemos hoy (así cuenta en el reto del año)
    if (newStatus === 'Read' && !bookToUpdate.fecha_fin) {
      updates.fecha_fin = new Date().toISOString().slice(0, 10);
    }
    updateBook(id, updates);
  };

  return (
    <LibraryContext.Provider value={{
        books,
        categories,
        shelves,
        loading,
        addBook,
        updateBook,
        deleteBook,
        updateProgress,
        createCategory,
        deleteCategory,
        assignCategory,
        removeCategory,
        createShelf,
        renameShelf,
        deleteShelf,
        toggleBookInShelf,
        refetchBooks
    }}>
      {children}
    </LibraryContext.Provider>
  );
};
