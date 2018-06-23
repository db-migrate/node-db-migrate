declare module 'db-migrate' {
  namespace DBMigrateNS {
    class DBMigrate {
      /**
       * Add a global defined variable to db-migrate, to enable access from
       * local migrations without configuring pathes.
       *
       * @return boolean
       */
      addGlobal (library: string): boolean

      /**
       * Registers and initializes hooks.
       *
       * @returns Promise
       */
      registerAPIHook (callback?: Function): Promise<any>

      /**
       * Add a configuration option to dbmigrate.
       *
       * @return boolean
       */
      addConfiguration (description: string, args: any[], type: string): boolean

      /**
       * Resets and sets argv to a specified new argv.
       */
      resetConfiguration (argv: any[]): void

      /**
       * Executes up a given number of migrations or a specific one.
       *
       * Defaults to up all migrations if no count is given.
       */
      up (specification?: string | number | Function, opts?: string | Function, callback?: Function): Promise<any>

      /**
       * Executes up a given number of migrations or a specific one.
       *
       * Defaults to up all migrations if no count is given.
       */
      down (specification?: number | Function, opts?: string | Function, callback?: Function): Promise<any>

      check (specification?: number | Function, opts?: string | Function, callback?: Function): Promise<any>

      /**
       * Executes up a given number of migrations or a specific one.
       *
       * Defaults to up all migrations if no count is given.
       */
      sync (specification?: string, opts?: string | Function, callback?: Function): Promise<any>

      /**
       * Executes down for all currently migrated migrations.
       */
      reset (scope?: string | Function, callback?: Function): Promise<any>

      /**
       * Silence the log output completely.
       */
      silence (isSilent: boolean): void

      /**
       * Transition migrations to the latest defined protocol.
       */
      transition (): void

      /**
       * Creates a correctly formatted migration
       */
      create (migrationName: string, scope?: string | Function, callback?: Function): Promise<any>

      /**
       * Creates a database of the given dbname.
       */
      createDatabase (dbname: string, callback?: Function): Promise<any>

      /**
       * Drops a database of the given dbname.
       */
      dropDatabase (dbname: string, callback?: Function): Promise<any>

      /**
       * Sets a config variable to the given value.
       *
       * @return value
       */
      setConfigParam (param: string, value: any): any

      /**
       * Sets the callback to the default onComplete
       */
      setDefaultCallback (): void

      /**
       * Let's the user customize the callback, which gets called after all
       * migrations have been done.
       */
      setCustomCallback (callback: Function): void

      /**
       * Seeds either the static or version controlled seeders, controlled by
       * the passed mode.
       */
      seed (mode?: string, scope?: string, callback?: Function): Promise<any>

      /**
       * Execute the down function of currently executed seeds.
       */
      undoSeed (specification?: number | string, scope?: string, callback?: Function): Promise<any>

      /**
       * Execute the reset function of currently executed seeds.
       */
      resetSeed (specification?: number | string, scope?: string, callback?: Function): Promise<any>

      /**
       * Executes the default routine.
       */
      run (): void
    }

    function getInstance (isModule?: boolean, options?: InstanceOptions, callback?: Function): DBMigrate

    interface InstanceOptions {
      cwd?: string
      config?: string | ConfigPerSource
      cmdOptions?: Object
      env?: string
      throwUncatched?: boolean
      noPlugins?: boolean
      database?: string
      multipleStatements?: boolean
    }

    interface ConfigPerSource {
      [_: string]: ConfigPerSourceOptions | string
    }

    type UsingENV = { 'ENV': string }

    interface ConfigPerSourceOptions {
      driver: string | UsingENV
      user?: string | UsingENV
      password?: string | UsingENV
      host?: string | UsingENV
      database?: string | UsingENV
      filename?: string | UsingENV
      schema?: string | UsingENV
    }
  }

  export = DBMigrateNS
}