"use client"; // This is a client component
import Head from 'next/head';
import "../flow/config";
import { useState, useEffect } from "react";
import * as fcl from "@onflow/fcl";

export default function Home() {

  const [user, setUser] = useState({loggedIn: null})
	// sets default value of loggedIn to null

  const [name, setName] = useState('')
  const [transactionStatus, setTransactionStatus] = useState(null)

  useEffect(() => fcl.currentUser.subscribe(setUser), [])

  const sendQuery = async () => {
    const profile = await fcl.query({
      cadence: `
        import Profile from 0xProfile

        pub fun main(address: Address): Profile.ReadOnly? {
          return Profile.read(address)
        }
      `,
      args: (arg, t) => [arg(user.addr, t.Address)]
    })

    setName(profile?.name ?? 'No Profile')
  }

  const initAccount = async () => {
    const transactionId = await fcl.mutate({
      cadence: `
        import Profile from 0xProfile
  
        transaction {
          prepare(account: AuthAccount) {
            // Only initialize the account if it hasn't already been initialized
            if (!Profile.check(account.address)) {
              // This creates and stores the profile in the user's account
              account.save(<- Profile.new(), to: Profile.privatePath)
  
              // This creates the public capability that lets applications read the profile's info
              account.link<&Profile.Base{Profile.Public}>(Profile.publicPath, target: Profile.privatePath)
            }
          }
        }
      `,
      payer: fcl.authz,
      proposer: fcl.authz,
      authorizations: [fcl.authz],
      limit: 50
    })
  
    const transaction = await fcl.tx(transactionId).onceSealed()

    console.log(transaction)
  }
  
  const executeTransaction = async () => {
    const transactionId = await fcl.mutate({
      cadence: `
        import Profile from 0xProfile

        transaction(name: String) {
          prepare(account: AuthAccount) {
            account
              .borrow<&Profile.Base{Profile.Owner}>(from: Profile.privatePath)!
              .setName(name)
          }
        }
      `,
      args: (arg, t) => [arg("Edoye", t.String)],
      payer: fcl.authz,
      proposer: fcl.authz,
      authorizations: [fcl.authz],
      limit: 50
    })

    fcl.tx(transactionId).subscribe(res => setTransactionStatus(res.status))
  }
  

  const AuthedState = () => {
    // function updates the user variable as true or false based on whether a user is logged in or not. 

    return (
	// generates a log out button if loggedIn is true
      <>
        <div>
          <div className='flex flex-col gap-2'>
            <div>Address: {user?.addr ?? "No Address"}</div>
            <div>Profile Name: {name ?? "--"}</div> 
            <div>Transaction Status: {transactionStatus ?? "--"}</div>
          </div>
          <div className='flex gap-4 m-5'>
            <button onClick={sendQuery} className='bg-sky-600 p-2 rounded-md text-[white]'>Send Query</button>
            <button onClick={initAccount} className='bg-sky-600 p-2 rounded-md text-[white]'>Init Account</button>
            <button onClick={executeTransaction} className='bg-sky-600 p-2 rounded-md text-[white]'>Execute Transaction</button>
            <button onClick={fcl.unauthenticate} className='bg-sky-600 p-2 rounded-md text-[white]'>Log Out</button>
          </div>
        </div>
      </>
        )
      }

      const UnauthenticatedState = () => {
        return (
	// displays default app settings when loggedIn is null
          <div className='flex gap-5'>
            <button onClick={fcl.logIn} className='bg-sky-600 p-2 rounded-md text-[white]'>Log In</button>
            <button onClick={fcl.signUp} className='bg-sky-600 p-2 rounded-md text-[white]'>Sign Up</button>
          </div>
        )
      }


      return (
        <div className='text-center h-screen flex flex-col justify-center items-center gap-4'>
          <Head>
            <title>FCL Quickstart with NextJS</title>
            <meta name="description" content="My first web3 app on Flow!" />
            <link rel="icon" href="/favicon.png" />
          </Head>
          <h1 className='text-2xl font-bold'>Flow Dapp</h1>
          {user.loggedIn
            ? <AuthedState />
            : <UnauthenticatedState />
          }
        </div>
      );
    }