import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AttributeManager from "@/components/AttributeManager";

const Configuration = () => {
  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configuration</h1>
        <p className="text-muted-foreground mt-1">
          Manage your inventory attributes and database structure
        </p>
      </div>

      <Tabs defaultValue="categories" className="w-full">
        <TabsList className="grid grid-cols-9 w-full">
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="brands">Brands</TabsTrigger>
          <TabsTrigger value="sizes">Sizes</TabsTrigger>
          <TabsTrigger value="colors">Colors</TabsTrigger>
          <TabsTrigger value="genders">Genders</TabsTrigger>
          <TabsTrigger value="seasons">Seasons</TabsTrigger>
          <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
          <TabsTrigger value="locations">Locations</TabsTrigger>
          <TabsTrigger value="units">Units</TabsTrigger>
        </TabsList>

        <TabsContent value="categories">
          <AttributeManager table="categories" title="Categories" />
        </TabsContent>
        <TabsContent value="brands">
          <AttributeManager table="brands" title="Brands" />
        </TabsContent>
        <TabsContent value="sizes">
          <AttributeManager table="sizes" title="Sizes" />
        </TabsContent>
        <TabsContent value="colors">
          <AttributeManager table="colors" title="Colors" />
        </TabsContent>
        <TabsContent value="genders">
          <AttributeManager table="genders" title="Genders" />
        </TabsContent>
        <TabsContent value="seasons">
          <AttributeManager table="seasons" title="Seasons" />
        </TabsContent>
        <TabsContent value="suppliers">
          <AttributeManager table="suppliers" title="Suppliers" />
        </TabsContent>
        <TabsContent value="locations">
          <AttributeManager table="locations" title="Locations" />
        </TabsContent>
        <TabsContent value="units">
          <AttributeManager table="units" title="Units" />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Configuration;
